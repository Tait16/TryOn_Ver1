import hashlib
import re
import uuid
from datetime import datetime
from decimal import Decimal
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel, Field, field_validator
from sqlalchemy import or_
from sqlalchemy.orm import Session, selectinload

from app.core.config import settings
from app.db.session import get_db
from app.models.product import Product
from app.models.product_asset import ProductAsset
from app.models.shop import Shop
from app.models.shop_widget_settings import ShopWidgetSettings
from app.models.tryon_job import TryOnJob
from app.services.ai_providers.kling_kolors import KlingKolorsError, KlingKolorsProvider

router = APIRouter(prefix="/api/v1/widget", tags=["Public Widget"])

MAX_DATA_URL_LENGTH = 9_000_000
ALLOWED_JOB_STATUSES = {"queued", "processing", "completed", "failed"}
KLING_TASK_PREFIX = "kling_kolors_task:"


def _slugify(value: str) -> str:
    normalized = re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")
    return normalized or value.lower()


def _is_uuid(value: str) -> bool:
    try:
        uuid.UUID(value)
        return True
    except ValueError:
        return False


def _normalize_public_image_url(value: str) -> str:
    trimmed = value.strip()
    if not trimmed:
        raise ValueError("Image URL is required.")

    if trimmed.startswith("data:image/"):
        if len(trimmed) > MAX_DATA_URL_LENGTH:
            raise ValueError("Uploaded image is too large.")
        return trimmed

    if not (trimmed.startswith("http://") or trimmed.startswith("https://")):
        raise ValueError("Only http/https image URLs or data:image URLs are supported.")

    return trimmed


def _hash_client_ip(request: Request) -> str | None:
    forwarded_for = request.headers.get("x-forwarded-for")
    raw_ip = forwarded_for.split(",")[0].strip() if forwarded_for else request.client.host if request.client else None
    if not raw_ip:
        return None
    return hashlib.sha256(raw_ip.encode("utf-8")).hexdigest()




def _is_kling_kolors_enabled() -> bool:
    return settings.ai_provider.strip().lower() in {"kling", "kling_kolors", "kolors"}


def _get_kling_provider() -> KlingKolorsProvider:
    if not settings.kling_access_key or not settings.kling_secret_key:
        raise HTTPException(
            status_code=500,
            detail="Kling Kolors is enabled but KLING_ACCESS_KEY or KLING_SECRET_KEY is missing.",
        )

    return KlingKolorsProvider(
        access_key=settings.kling_access_key,
        secret_key=settings.kling_secret_key,
        base_url=settings.kling_base_url,
        model_name=settings.kling_vton_model,
        timeout_seconds=settings.kling_timeout_seconds,
    )


def _store_kling_task_id(task_id: str) -> str:
    return f"{KLING_TASK_PREFIX}{task_id}"


def _extract_kling_task_id(job: TryOnJob) -> str | None:
    if not job.error_code or not job.error_code.startswith(KLING_TASK_PREFIX):
        return None
    return job.error_code.removeprefix(KLING_TASK_PREFIX)

def _resolve_shop(db: Session, shop_ref: str) -> Shop:
    ref = shop_ref.strip()
    if not ref:
        raise HTTPException(status_code=400, detail="shop_ref is required")

    query = db.query(Shop)
    if _is_uuid(ref):
        shop = query.filter(Shop.id == uuid.UUID(ref)).first()
    else:
        shop = query.filter(or_(Shop.domain == ref, Shop.name == ref)).first()
        if not shop:
            shops = query.all()
            shop = next((candidate for candidate in shops if _slugify(candidate.name) == ref.lower()), None)

    if not shop:
        raise HTTPException(status_code=404, detail="Shop not found")

    if shop.status != "active":
        raise HTTPException(status_code=403, detail="Shop is not active")

    return shop


def _first_asset(product: Product) -> ProductAsset | None:
    active_assets = [asset for asset in product.assets if asset.status != "deleted"]
    return sorted(active_assets, key=lambda asset: asset.created_at or datetime.min)[0] if active_assets else None


def _product_to_response(product: Product) -> dict:
    asset = _first_asset(product)
    return {
        "id": str(product.id),
        "shop_id": str(product.shop_id),
        "name": product.name,
        "category": product.category,
        "price": str(product.price) if isinstance(product.price, Decimal) else product.price,
        "currency": product.currency,
        "product_url": product.product_url,
        "status": product.status,
        "image_url": asset.original_image_url if asset else None,
        "thumbnail_url": asset.thumbnail_url if asset else None,
    }


def _shop_to_response(shop: Shop) -> dict:
    return {
        "id": str(shop.id),
        "name": shop.name,
        "domain": shop.domain,
        "status": shop.status,
        "plan": shop.plan,
    }


def _get_or_create_widget_settings(db: Session, shop_id: uuid.UUID) -> ShopWidgetSettings:
    settings = db.query(ShopWidgetSettings).filter(ShopWidgetSettings.shop_id == shop_id).first()
    if settings:
        return settings

    settings = ShopWidgetSettings(shop_id=shop_id)
    db.add(settings)
    db.commit()
    db.refresh(settings)
    return settings


def _widget_settings_to_response(shop: Shop, settings: ShopWidgetSettings) -> dict:
    return {
        "shop": {
            "id": str(shop.id),
            "name": shop.name,
            "domain": shop.domain,
            "status": shop.status,
            "plan": shop.plan,
            "logo_url": settings.logo_url,
            "cover_image_url": settings.cover_image_url,
        },
        "theme": {
            "primary_color": settings.primary_color,
            "button_color": settings.button_color,
            "background_color": settings.background_color,
            "text_color": settings.text_color,
        },
        "labels": {
            "headline": settings.headline,
            "subheadline": settings.subheadline,
            "tryon_button_text": settings.tryon_button_text,
            "buy_button_text": settings.buy_button_text,
        },
        "behavior": {
            "show_price": settings.show_price,
            "show_buy_button": settings.show_buy_button,
            "default_product_sort": settings.default_product_sort,
            "fallback_product_image_url": settings.fallback_product_image_url,
        },
    }


class WidgetShopResponse(BaseModel):
    id: str
    name: str
    domain: str | None = None
    status: str
    plan: str


class WidgetConfigShopResponse(WidgetShopResponse):
    logo_url: str | None = None
    cover_image_url: str | None = None


class WidgetThemeResponse(BaseModel):
    primary_color: str
    button_color: str
    background_color: str
    text_color: str


class WidgetLabelsResponse(BaseModel):
    headline: str
    subheadline: str
    tryon_button_text: str
    buy_button_text: str


class WidgetBehaviorResponse(BaseModel):
    show_price: bool
    show_buy_button: bool
    default_product_sort: str
    fallback_product_image_url: str | None = None


class WidgetConfigResponse(BaseModel):
    shop: WidgetConfigShopResponse
    theme: WidgetThemeResponse
    labels: WidgetLabelsResponse
    behavior: WidgetBehaviorResponse


class WidgetProductResponse(BaseModel):
    id: str
    shop_id: str
    name: str
    category: str
    price: str | float | int | None = None
    currency: str | None = None
    product_url: str | None = None
    status: str
    image_url: str | None = None
    thumbnail_url: str | None = None


class WidgetCatalogResponse(BaseModel):
    shop: WidgetShopResponse
    products: list[WidgetProductResponse]


class WidgetProductDetailResponse(BaseModel):
    shop: WidgetShopResponse
    product: WidgetProductResponse


class WidgetTryOnJobCreate(BaseModel):
    product_id: uuid.UUID
    user_image_url: str = Field(min_length=1)
    visitor_id: str | None = Field(default=None, max_length=255)

    @field_validator("user_image_url")
    @classmethod
    def validate_user_image_url(cls, value: str) -> str:
        try:
            return _normalize_public_image_url(value)
        except ValueError as exc:
            raise ValueError(str(exc)) from exc


class WidgetTryOnJobResponse(BaseModel):
    id: str
    shop_id: str
    product_id: str
    user_image_url: str | None = None
    result_image_url: str | None = None
    status: Literal["queued", "processing", "completed", "failed"] | str
    validation_status: str | None = None
    error_code: str | None = None
    error_message: str | None = None
    created_at: datetime
    updated_at: datetime


def _job_to_response(job: TryOnJob) -> dict:
    return {
        "id": str(job.id),
        "shop_id": str(job.shop_id),
        "product_id": str(job.product_id),
        "user_image_url": job.user_image_url,
        "result_image_url": job.result_image_url,
        "status": job.status if job.status in ALLOWED_JOB_STATUSES else "queued",
        "validation_status": job.validation_status,
        "error_code": job.error_code,
        "error_message": job.error_message,
        "created_at": job.created_at,
        "updated_at": job.updated_at,
    }


@router.get(
    "/shops/{shop_ref}/config",
    response_model=WidgetConfigResponse,
    summary="Get public widget branding/config for a shop",
)
def get_widget_config(shop_ref: str, db: Session = Depends(get_db)):
    shop = _resolve_shop(db, shop_ref)
    settings = _get_or_create_widget_settings(db, shop.id)
    return _widget_settings_to_response(shop, settings)


@router.get(
    "/shops/{shop_ref}/products",
    response_model=WidgetCatalogResponse,
    summary="List public widget products for a shop",
)
def list_widget_products(shop_ref: str, db: Session = Depends(get_db)):
    shop = _resolve_shop(db, shop_ref)
    products = (
        db.query(Product)
        .options(selectinload(Product.assets))
        .filter(Product.shop_id == shop.id, Product.status == "active")
        .order_by(Product.created_at.desc())
        .all()
    )

    public_products = [product for product in products if _first_asset(product)]
    return {
        "shop": _shop_to_response(shop),
        "products": [_product_to_response(product) for product in public_products],
    }


@router.get(
    "/products/{product_id}",
    response_model=WidgetProductDetailResponse,
    summary="Get one public widget product",
)
def get_widget_product(product_id: uuid.UUID, shop_ref: str | None = None, db: Session = Depends(get_db)):
    product = (
        db.query(Product)
        .options(selectinload(Product.assets), selectinload(Product.shop))
        .filter(Product.id == product_id)
        .first()
    )

    if not product or product.status != "active":
        raise HTTPException(status_code=404, detail="Product not found")

    if shop_ref:
        shop = _resolve_shop(db, shop_ref)
        if product.shop_id != shop.id:
            raise HTTPException(status_code=404, detail="Product not found for this shop")
    else:
        shop = product.shop
        if not shop or shop.status != "active":
            raise HTTPException(status_code=403, detail="Shop is not active")

    if not _first_asset(product):
        raise HTTPException(status_code=404, detail="Product does not have a public image")

    return {
        "shop": _shop_to_response(shop),
        "product": _product_to_response(product),
    }


@router.post(
    "/tryon-jobs",
    response_model=WidgetTryOnJobResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a public widget try-on job",
)
def create_widget_tryon_job(payload: WidgetTryOnJobCreate, request: Request, db: Session = Depends(get_db)):
    product = (
        db.query(Product)
        .options(selectinload(Product.assets), selectinload(Product.shop))
        .filter(Product.id == payload.product_id)
        .first()
    )

    if not product or product.status != "active":
        raise HTTPException(status_code=404, detail="Product not found")

    if not product.shop or product.shop.status != "active":
        raise HTTPException(status_code=403, detail="Shop is not active")

    if not _first_asset(product):
        raise HTTPException(status_code=400, detail="Product must have one public image before try-on")

    product_asset = _first_asset(product)
    assert product_asset is not None

    job = TryOnJob(
        shop_id=product.shop_id,
        product_id=product.id,
        user_image_url=payload.user_image_url,
        result_image_url=None,
        status="queued",
        validation_status="pending",
        visitor_id=payload.visitor_id,
        client_ip_hash=_hash_client_ip(request),
        user_agent=request.headers.get("user-agent"),
        is_billable=False,
    )

    if settings.ai_provider.strip().lower() == "mock":
        job.result_image_url = payload.user_image_url
        job.status = "completed"
        job.validation_status = "mocked"
        job.is_billable = True
    elif _is_kling_kolors_enabled():
        try:
            provider = _get_kling_provider()
            submitted = provider.submit_tryon(
                human_image_url=payload.user_image_url,
                cloth_image_url=product_asset.original_image_url,
                callback_url=settings.kling_callback_url,
            )
            job.status = "processing"
            job.validation_status = submitted.status
            job.is_billable = True
            # This project does not currently have a provider_task_id column.
            # Store the provider task id in error_code with a namespaced prefix to avoid a DB migration.
            # TODO production: add provider/provider_job_id columns and move this value there.
            job.error_code = _store_kling_task_id(submitted.task_id)
        except KlingKolorsError as exc:
            job.status = "failed"
            job.validation_status = "provider_rejected"
            job.error_code = "KLING_KOLORS_SUBMIT_FAILED"
            job.error_message = str(exc)
            job.is_billable = False
    else:
        job.status = "failed"
        job.validation_status = "unsupported_provider"
        job.error_code = "UNSUPPORTED_AI_PROVIDER"
        job.error_message = f"Unsupported AI_PROVIDER: {settings.ai_provider}"
        job.is_billable = False
    db.add(job)
    db.commit()
    db.refresh(job)
    return _job_to_response(job)


@router.get(
    "/tryon-jobs/{job_id}",
    response_model=WidgetTryOnJobResponse,
    summary="Get public widget try-on job status",
)
def get_widget_tryon_job(job_id: uuid.UUID, db: Session = Depends(get_db)):
    job = db.query(TryOnJob).filter(TryOnJob.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Try-on job not found")

    if _is_kling_kolors_enabled() and job.status in {"queued", "processing"}:
        task_id = _extract_kling_task_id(job)
        if task_id:
            try:
                provider = _get_kling_provider()
                result = provider.get_tryon_result(task_id=task_id)
                if result.status == "completed":
                    job.status = "completed"
                    job.result_image_url = result.result_image_url
                    job.validation_status = "succeed"
                    job.error_code = None
                    job.error_message = None
                    db.commit()
                    db.refresh(job)
                elif result.status == "failed":
                    job.status = "failed"
                    job.validation_status = "failed"
                    job.error_code = "KLING_KOLORS_TASK_FAILED"
                    job.error_message = result.error_message
                    db.commit()
                    db.refresh(job)
                else:
                    job.status = "processing"
                    job.validation_status = "processing"
                    db.commit()
                    db.refresh(job)
            except KlingKolorsError as exc:
                # Do not permanently fail immediately on a polling/network error.
                # Keep the task id so the next poll can retry.
                job.status = "processing"
                job.validation_status = "poll_error"
                job.error_message = str(exc)
                db.commit()
                db.refresh(job)

    return _job_to_response(job)
