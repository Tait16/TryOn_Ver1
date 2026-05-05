from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from jose import jwt
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.password import hash_password, verify_password
from app.db.session import get_db
from app.models.accounts import Accounts
from app.schemas.auth import LoginRequest, RegisterRequest, TokenResponse, UserPublic

router = APIRouter(prefix="/api/v1/auth", tags=["Auth"])


def _create_access_token(*, subject: str, extra: dict) -> str:
    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.jwt_expires_minutes)
    payload = {"sub": subject, "exp": expire, **extra}
    return jwt.encode(
        payload,
        settings.jwt_secret,
        algorithm=settings.jwt_algorithm,
    )


@router.post("/login", response_model=TokenResponse)
def login(body: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(Accounts).filter(Accounts.username == body.username).first()
    if user is None or not verify_password(body.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Sai tên đăng nhập hoặc mật khẩu",
        )

    token = _create_access_token(
        subject=str(user.id),
        extra={"username": user.username, "role": user.role},
    )
    return TokenResponse(
        access_token=token,
        user=UserPublic.model_validate(user),
    )


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
def register(body: RegisterRequest, db: Session = Depends(get_db)):
    if db.query(Accounts).filter(Accounts.username == body.username).first():
        raise HTTPException(status_code=400, detail="Username đã được sử dụng")
    if db.query(Accounts).filter(Accounts.email == body.email).first():
        raise HTTPException(status_code=400, detail="Email đã được sử dụng")

    user = Accounts(
        username=body.username,
        email=body.email,
        password_hash=hash_password(body.password),
        full_name=body.full_name,
        role=body.role,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    token = _create_access_token(
        subject=str(user.id),
        extra={"username": user.username, "role": user.role},
    )
    return TokenResponse(
        access_token=token,
        user=UserPublic.model_validate(user),
    )
