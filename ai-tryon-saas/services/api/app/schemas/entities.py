import uuid
from datetime import datetime
from decimal import Decimal
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator


class ORMBase(BaseModel):
    model_config = ConfigDict(
        from_attributes=True,
        populate_by_name=True,
    )



# =========================
# Accounts
# =========================
class AccountsCreate(BaseModel):
    username: str
    email: str
    password_hash: str
    full_name: str | None = None
    role: str = "admin"


class AccountsUpdate(BaseModel):
    username: str | None = None
    email: str | None = None
    password_hash: str | None = None
    full_name: str | None = None
    role: str | None = None


class AccountsResponse(ORMBase):
    id: uuid.UUID
    username: str
    email: str
    full_name: str | None = None
    role: str
    created_at: datetime
# =========================
# Shops
# =========================

class ShopCreate(BaseModel):
    name: str
    domain: str | None = None
    status: str = "active"
    plan: str = "pilot"


class ShopUpdate(BaseModel):
    name: str | None = None
    domain: str | None = None
    status: str | None = None
    plan: str | None = None


class ShopResponse(ORMBase):
    id: uuid.UUID
    name: str
    domain: str | None = None
    status: str
    plan: str
    created_at: datetime
    updated_at: datetime


# =========================
# Shop Users
# =========================

class ShopUserCreate(BaseModel):
    shop_id: uuid.UUID
    email: str
    password_hash: str
    full_name: str | None = None
    role: str = "owner"


class ShopUserUpdate(BaseModel):
    email: str | None = None
    password_hash: str | None = None
    full_name: str | None = None
    role: str | None = None


class ShopUserResponse(ORMBase):
    id: uuid.UUID
    shop_id: uuid.UUID
    email: str
    full_name: str | None = None
    role: str
    created_at: datetime


# =========================
# API Keys
# =========================

class ApiKeyCreate(BaseModel):
    shop_id: uuid.UUID
    key_prefix: str
    key_hash: str
    status: str = "active"


class ApiKeyUpdate(BaseModel):
    key_prefix: str | None = None
    key_hash: str | None = None
    status: str | None = None
    last_used_at: datetime | None = None


class ApiKeyResponse(ORMBase):
    id: uuid.UUID
    shop_id: uuid.UUID
    key_prefix: str
    key_hash: str
    status: str
    created_at: datetime
    last_used_at: datetime | None = None


# =========================
# Products
# =========================

class ProductCreate(BaseModel):
    shop_id: uuid.UUID
    external_product_id: str | None = None
    name: str
    category: str
    price: Decimal | None = None
    currency: str = "VND"
    product_url: str | None = None
    status: str = "draft"
    metadata: dict[str, Any] | None = None


class ProductUpdate(BaseModel):
    external_product_id: str | None = None
    name: str | None = None
    category: str | None = None
    price: Decimal | None = None
    currency: str | None = None
    product_url: str | None = None
    status: str | None = None
    metadata: dict[str, Any] | None = None


class ProductResponse(ORMBase):
    id: uuid.UUID
    shop_id: uuid.UUID
    external_product_id: str | None = None
    name: str
    category: str
    price: Decimal | None = None
    currency: str | None = None
    product_url: str | None = None
    status: str
    metadata: dict[str, Any] | None = Field(default=None, alias="metadata_")
    created_at: datetime
    updated_at: datetime


# =========================
# Product Assets
# =========================

class ProductAssetCreate(BaseModel):
    product_id: uuid.UUID
    original_image_url: str
    processed_image_url: str | None = None
    mask_image_url: str | None = None
    thumbnail_url: str | None = None
    status: str = "uploaded"
    error_message: str | None = None


class ProductAssetUpdate(BaseModel):
    original_image_url: str | None = None
    processed_image_url: str | None = None
    mask_image_url: str | None = None
    thumbnail_url: str | None = None
    status: str | None = None
    error_message: str | None = None


class ProductAssetResponse(ORMBase):
    id: uuid.UUID
    product_id: uuid.UUID
    original_image_url: str
    processed_image_url: str | None = None
    mask_image_url: str | None = None
    thumbnail_url: str | None = None
    status: str
    error_message: str | None = None
    created_at: datetime
    updated_at: datetime


# =========================
# Try-On Jobs
# =========================

class TryonJobCreate(BaseModel):
    shop_id: uuid.UUID
    product_id: uuid.UUID
    user_image_url: str | None = None
    result_image_url: str | None = None
    status: str = "queued"
    validation_status: str | None = None
    error_code: str | None = None
    error_message: str | None = None
    processing_time_ms: int | None = None
    ai_cost_usd: Decimal | None = None
    is_billable: bool = False
    visitor_id: str | None = None
    client_ip_hash: str | None = None
    user_agent: str | None = None


class TryonJobUpdate(BaseModel):
    user_image_url: str | None = None
    result_image_url: str | None = None
    status: str | None = None
    validation_status: str | None = None
    error_code: str | None = None
    error_message: str | None = None
    processing_time_ms: int | None = None
    ai_cost_usd: Decimal | None = None
    is_billable: bool | None = None
    visitor_id: str | None = None
    client_ip_hash: str | None = None
    user_agent: str | None = None


class TryonJobResponse(ORMBase):
    id: uuid.UUID
    shop_id: uuid.UUID
    product_id: uuid.UUID
    user_image_url: str | None = None
    result_image_url: str | None = None
    status: str
    validation_status: str | None = None
    error_code: str | None = None
    error_message: str | None = None
    processing_time_ms: int | None = None
    ai_cost_usd: Decimal | None = None
    is_billable: bool
    visitor_id: str | None = None
    client_ip_hash: str | None = None
    user_agent: str | None = None
    created_at: datetime
    updated_at: datetime


# =========================
# Usage Events
# =========================

class UsageEventCreate(BaseModel):
    shop_id: uuid.UUID
    product_id: uuid.UUID | None = None
    tryon_job_id: uuid.UUID | None = None
    event_type: str
    visitor_id: str | None = None
    metadata: dict[str, Any] | None = None


class UsageEventUpdate(BaseModel):
    product_id: uuid.UUID | None = None
    tryon_job_id: uuid.UUID | None = None
    event_type: str | None = None
    visitor_id: str | None = None
    metadata: dict[str, Any] | None = None


class UsageEventResponse(ORMBase):
    id: uuid.UUID
    shop_id: uuid.UUID
    product_id: uuid.UUID | None = None
    tryon_job_id: uuid.UUID | None = None
    event_type: str
    visitor_id: str | None = None
    metadata: dict[str, Any] | None = Field(default=None, alias="metadata_")
    created_at: datetime


# =========================
# Plans
# =========================

class PlanCreate(BaseModel):
    code: str
    name: str
    monthly_price: Decimal
    included_tryons: int
    overage_price: Decimal | None = None


class PlanUpdate(BaseModel):
    code: str | None = None
    name: str | None = None
    monthly_price: Decimal | None = None
    included_tryons: int | None = None
    overage_price: Decimal | None = None


class PlanResponse(ORMBase):
    id: uuid.UUID
    code: str
    name: str
    monthly_price: Decimal
    included_tryons: int
    overage_price: Decimal | None = None
    created_at: datetime


# =========================
# Shop Subscriptions
# =========================

class ShopSubscriptionCreate(BaseModel):
    shop_id: uuid.UUID
    plan_id: uuid.UUID
    status: str = "active"
    current_period_start: datetime
    current_period_end: datetime


class ShopSubscriptionUpdate(BaseModel):
    plan_id: uuid.UUID | None = None
    status: str | None = None
    current_period_start: datetime | None = None
    current_period_end: datetime | None = None


class ShopSubscriptionResponse(ORMBase):
    id: uuid.UUID
    shop_id: uuid.UUID
    plan_id: uuid.UUID
    status: str
    current_period_start: datetime
    current_period_end: datetime
    created_at: datetime


# =========================
# Monthly Usage
# =========================

class MonthlyUsageCreate(BaseModel):
    shop_id: uuid.UUID
    year_month: str
    billable_tryons: int = 0
    total_tryon_requests: int = 0
    failed_tryons: int = 0
    rejected_tryons: int = 0


class MonthlyUsageUpdate(BaseModel):
    billable_tryons: int | None = None
    total_tryon_requests: int | None = None
    failed_tryons: int | None = None
    rejected_tryons: int | None = None


class MonthlyUsageResponse(ORMBase):
    id: uuid.UUID
    shop_id: uuid.UUID
    year_month: str
    billable_tryons: int
    total_tryon_requests: int
    failed_tryons: int
    rejected_tryons: int
    created_at: datetime
    updated_at: datetime




# =========================
# Shop Widget Settings
# =========================

WidgetProductSort = Literal["latest", "most_tryon", "price_asc", "price_desc", "name_asc"]


def _validate_hex_color(value: str) -> str:
    if len(value) != 7 or not value.startswith("#"):
        raise ValueError("Color must be HEX format #RRGGBB")
    hex_part = value[1:]
    if not all(char in "0123456789abcdefABCDEF" for char in hex_part):
        raise ValueError("Color must be HEX format #RRGGBB")
    return value


def _validate_http_url(value: str | None) -> str | None:
    if value is None or value == "":
        return value
    if not (value.startswith("http://") or value.startswith("https://")):
        raise ValueError("URL must start with http:// or https://")
    return value


class ShopWidgetSettingsCreate(BaseModel):
    shop_id: uuid.UUID
    logo_url: str | None = None
    cover_image_url: str | None = None
    fallback_product_image_url: str | None = None
    primary_color: str = "#2563EB"
    button_color: str = "#111827"
    background_color: str = "#FFFFFF"
    text_color: str = "#0F172A"
    headline: str = Field(default="Thử đồ AI trước khi mua", max_length=120)
    subheadline: str = Field(default="Upload ảnh của bạn và xem sản phẩm phù hợp thế nào", max_length=240)
    tryon_button_text: str = Field(default="Thử đồ AI", max_length=40)
    buy_button_text: str = Field(default="Mua ngay", max_length=40)
    show_price: bool = True
    show_buy_button: bool = True
    default_product_sort: WidgetProductSort = "latest"
    metadata: dict[str, Any] | None = None

    @field_validator("primary_color", "button_color", "background_color", "text_color")
    @classmethod
    def validate_colors(cls, value: str) -> str:
        return _validate_hex_color(value)

    @field_validator("logo_url", "cover_image_url", "fallback_product_image_url")
    @classmethod
    def validate_urls(cls, value: str | None) -> str | None:
        return _validate_http_url(value)


class ShopWidgetSettingsUpdate(BaseModel):
    logo_url: str | None = None
    cover_image_url: str | None = None
    fallback_product_image_url: str | None = None
    primary_color: str | None = None
    button_color: str | None = None
    background_color: str | None = None
    text_color: str | None = None
    headline: str | None = Field(default=None, max_length=120)
    subheadline: str | None = Field(default=None, max_length=240)
    tryon_button_text: str | None = Field(default=None, max_length=40)
    buy_button_text: str | None = Field(default=None, max_length=40)
    show_price: bool | None = None
    show_buy_button: bool | None = None
    default_product_sort: WidgetProductSort | None = None
    metadata: dict[str, Any] | None = None

    @field_validator("primary_color", "button_color", "background_color", "text_color")
    @classmethod
    def validate_optional_colors(cls, value: str | None) -> str | None:
        if value is None:
            return value
        return _validate_hex_color(value)

    @field_validator("logo_url", "cover_image_url", "fallback_product_image_url")
    @classmethod
    def validate_optional_urls(cls, value: str | None) -> str | None:
        return _validate_http_url(value)


class ShopWidgetSettingsResponse(ORMBase):
    id: uuid.UUID
    shop_id: uuid.UUID
    logo_url: str | None = None
    cover_image_url: str | None = None
    fallback_product_image_url: str | None = None
    primary_color: str
    button_color: str
    background_color: str
    text_color: str
    headline: str
    subheadline: str
    tryon_button_text: str
    buy_button_text: str
    show_price: bool
    show_buy_button: bool
    default_product_sort: str
    metadata: dict[str, Any] | None = Field(default=None, alias="metadata_")
    created_at: datetime
    updated_at: datetime

# =========================
# Body Models
# =========================
 
