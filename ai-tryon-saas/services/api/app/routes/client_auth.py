import uuid
from datetime import datetime, timedelta, timezone
import smtplib
from email.message import EmailMessage

from fastapi import APIRouter, Depends, HTTPException, status
from jose import JWTError, jwt
from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator
from sqlalchemy import func as sa_func
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.password import hash_password, verify_password
from app.db.session import get_db
from app.models.shop import Shop
from app.models.shop_users import ShopUser

router = APIRouter(prefix="/api/v1/client", tags=["Client Auth"])


class ClientLoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=1, max_length=256)

    @field_validator("email", mode="before")
    @classmethod
    def _strip_email(cls, v: object) -> object:
        if isinstance(v, str):
            return v.strip()
        return v


class ClientShopUserPublic(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    shop_id: uuid.UUID
    email: str
    full_name: str | None = None
    role: str
    created_at: datetime


class ClientShopPublic(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    domain: str | None = None
    status: str
    plan: str
    created_at: datetime
    updated_at: datetime


class ClientTokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: ClientShopUserPublic
    shop: ClientShopPublic


class ForgotPasswordRequest(BaseModel):
    email: EmailStr

    @field_validator("email", mode="before")
    @classmethod
    def _strip_forgot_email(cls, v: object) -> object:
        if isinstance(v, str):
            return v.strip()
        return v


class ForgotPasswordResponse(BaseModel):
    message: str


class ResetPasswordRequest(BaseModel):
    token: str = Field(..., min_length=1)
    password: str = Field(..., min_length=8, max_length=256)


def _create_access_token(*, subject: str, extra: dict, minutes: int | None = None) -> str:
    expire = datetime.now(timezone.utc) + timedelta(minutes=minutes or settings.jwt_expires_minutes)
    payload = {"sub": subject, "exp": expire, **extra}
    return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)


def _send_reset_email(*, to_email: str, reset_link: str) -> None:
    subject = "AI Try-On - Đặt lại mật khẩu client"
    body = f"""Xin chào,

Bạn vừa yêu cầu đặt lại mật khẩu cho tài khoản shop user.

Mở link dưới đây để tạo mật khẩu mới. Link có hiệu lực trong 30 phút:
{reset_link}

Nếu bạn không yêu cầu thao tác này, hãy bỏ qua email này.
"""

    smtp_host = getattr(settings, "smtp_host", None)
    smtp_port = getattr(settings, "smtp_port", 587)
    smtp_user = getattr(settings, "smtp_user", None)
    smtp_password = getattr(settings, "smtp_password", None)
    smtp_from = getattr(settings, "smtp_from", None) or smtp_user

    if not smtp_host or not smtp_from:
        print("[CLIENT_RESET_PASSWORD_LINK]", reset_link)
        return

    message = EmailMessage()
    message["Subject"] = subject
    message["From"] = smtp_from
    message["To"] = to_email
    message.set_content(body)

    with smtplib.SMTP(smtp_host, smtp_port) as server:
        server.starttls()
        if smtp_user and smtp_password:
            server.login(smtp_user, smtp_password)
        server.send_message(message)


def _find_shop_user_by_email(db: Session, email: str) -> ShopUser | None:
    normalized = str(email).strip().lower()
    if not normalized:
        return None
    return (
        db.query(ShopUser)
        .filter(sa_func.lower(sa_func.trim(ShopUser.email)) == normalized)
        .first()
    )


@router.post("/login", response_model=ClientTokenResponse)
def client_login(body: ClientLoginRequest, db: Session = Depends(get_db)):
    user = _find_shop_user_by_email(db, str(body.email))
    if user is None or not verify_password(body.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email hoặc mật khẩu không đúng",
        )

    shop = db.query(Shop).filter(Shop.id == user.shop_id).first()
    if shop is None:
        raise HTTPException(
            status_code=404,
            detail=(
                "Không tìm thấy shop cho tài khoản này (shop_id không khớp bảng shops). "
                "Kiểm tra dữ liệu shops / shop_users."
            ),
        )
    if shop.status != "active":
        raise HTTPException(
            status_code=403,
            detail=(
                f'Shop "{shop.name}" đang trạng thái "{shop.status}" (cần active để đăng nhập client).'
            ),
        )

    token = _create_access_token(
        subject=str(user.id),
        extra={
            "email": user.email,
            "shop_id": str(user.shop_id),
            "role": user.role,
            "scope": "client",
        },
    )

    return ClientTokenResponse(
        access_token=token,
        user=ClientShopUserPublic.model_validate(user),
        shop=ClientShopPublic.model_validate(shop),
    )


@router.post("/forgot-password", response_model=ForgotPasswordResponse)
def forgot_password(body: ForgotPasswordRequest, db: Session = Depends(get_db)):
    user = _find_shop_user_by_email(db, str(body.email))

    # Luôn trả về message chung để tránh lộ email nào đang tồn tại trong hệ thống.
    generic_message = "Nếu email tồn tại, hệ thống đã gửi link đặt lại mật khẩu."
    if user is None:
        return ForgotPasswordResponse(message=generic_message)

    token = _create_access_token(
        subject=str(user.id),
        extra={"email": user.email, "shop_id": str(user.shop_id), "scope": "client_password_reset"},
        minutes=30,
    )
    reset_base_url = getattr(settings, "client_reset_password_url", "http://localhost:3000/clients/forgetpassword")
    reset_link = f"{reset_base_url}?token={token}"
    _send_reset_email(to_email=user.email, reset_link=reset_link)

    return ForgotPasswordResponse(message=generic_message)


@router.post("/reset-password", response_model=ForgotPasswordResponse)
def reset_password(body: ResetPasswordRequest, db: Session = Depends(get_db)):
    try:
        payload = jwt.decode(body.token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
    except JWTError:
        raise HTTPException(status_code=400, detail="Link đặt lại mật khẩu không hợp lệ hoặc đã hết hạn")

    if payload.get("scope") != "client_password_reset":
        raise HTTPException(status_code=400, detail="Token không hợp lệ")

    user_id = payload.get("sub")
    user = db.query(ShopUser).filter(ShopUser.id == user_id).first()
    if user is None:
        raise HTTPException(status_code=404, detail="Tài khoản không tồn tại")

    user.password_hash = hash_password(body.password)
    db.add(user)
    db.commit()

    return ForgotPasswordResponse(message="Đã cập nhật mật khẩu. Bạn có thể đăng nhập lại.")
