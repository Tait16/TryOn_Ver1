import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError
from sqlalchemy.orm import Session

from app.core.security import decode_access_token
from app.db.session import get_db
from app.models.shop_widget_settings import ShopWidgetSettings
from app.models.shop_users import ShopUser
from app.schemas.entities import ShopWidgetSettingsResponse, ShopWidgetSettingsUpdate

router = APIRouter(prefix="/api/v1/shop-widget-settings", tags=["Shop Widget Settings"])
security = HTTPBearer(auto_error=False)


DEFAULT_WIDGET_SETTINGS = {
    "primary_color": "#2563EB",
    "button_color": "#111827",
    "background_color": "#FFFFFF",
    "text_color": "#0F172A",
    "headline": "Thử đồ AI trước khi mua",
    "subheadline": "Upload ảnh của bạn và xem sản phẩm phù hợp thế nào",
    "tryon_button_text": "Thử đồ AI",
    "buy_button_text": "Mua ngay",
    "show_price": True,
    "show_buy_button": True,
    "default_product_sort": "latest",
    "metadata_": {},
}


def get_current_client_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(security),
    db: Session = Depends(get_db),
) -> ShopUser:
    if credentials is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing bearer token")

    try:
        payload = decode_access_token(credentials.credentials)
    except JWTError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token") from exc

    if payload.get("scope") != "client":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Invalid token scope")

    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token subject")

    user = db.query(ShopUser).filter(ShopUser.id == uuid.UUID(str(user_id))).first()
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Shop user not found")

    return user


def can_update_widget_settings(user: ShopUser) -> bool:
    return user.role in {"owner", "shop_owner", "admin"}


def get_or_create_widget_settings(db: Session, shop_id: uuid.UUID) -> ShopWidgetSettings:
    settings = db.query(ShopWidgetSettings).filter(ShopWidgetSettings.shop_id == shop_id).first()
    if settings:
        return settings

    settings = ShopWidgetSettings(shop_id=shop_id, **DEFAULT_WIDGET_SETTINGS)
    db.add(settings)
    db.commit()
    db.refresh(settings)
    return settings


@router.get("/me", response_model=ShopWidgetSettingsResponse, response_model_by_alias=False)
def get_my_widget_settings(
    db: Session = Depends(get_db),
    current_user: ShopUser = Depends(get_current_client_user),
):
    return get_or_create_widget_settings(db, current_user.shop_id)


@router.put("/me", response_model=ShopWidgetSettingsResponse, response_model_by_alias=False)
def update_my_widget_settings(
    payload: ShopWidgetSettingsUpdate,
    db: Session = Depends(get_db),
    current_user: ShopUser = Depends(get_current_client_user),
):
    if not can_update_widget_settings(current_user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only shop owner or admin can update widget settings.",
        )

    settings = get_or_create_widget_settings(db, current_user.shop_id)
    update_data = payload.model_dump(exclude_unset=True)

    if "metadata" in update_data:
        update_data["metadata_"] = update_data.pop("metadata")

    for key, value in update_data.items():
        setattr(settings, key, value)

    db.add(settings)
    db.commit()
    db.refresh(settings)
    return settings
