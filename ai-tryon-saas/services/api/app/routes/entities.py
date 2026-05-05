import uuid
from typing import Type

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.services import crud_service

from app.models.shop import Shop
from app.models.shop_users import ShopUser
from app.models.api_key import ApiKey
from app.models.product import Product
from app.models.product_asset import ProductAsset
from app.models.tryon_job import TryOnJob
from app.models.usage_events import UsageEvent
from app.models.plans import Plan
from app.models.shop_subscriptions import ShopSubscription
from app.models.monthly_usages import MonthlyUsage
from app.models.accounts import Accounts
from app.schemas.entities import (
    ShopCreate,
    ShopUpdate,
    ShopResponse,
    ShopUserCreate,
    ShopUserUpdate,
    ShopUserResponse,
    ApiKeyCreate,
    ApiKeyUpdate,
    ApiKeyResponse,
    ProductCreate,
    ProductUpdate,
    ProductResponse,
    ProductAssetCreate,
    ProductAssetUpdate,
    ProductAssetResponse,
    TryonJobCreate,
    TryonJobUpdate,
    TryonJobResponse,
    UsageEventCreate,
    UsageEventUpdate,
    UsageEventResponse,
    PlanCreate,
    PlanUpdate,
    PlanResponse,
    ShopSubscriptionCreate,
    ShopSubscriptionUpdate,
    ShopSubscriptionResponse,
    MonthlyUsageCreate,
    MonthlyUsageUpdate,
    MonthlyUsageResponse,
    AccountsCreate,
    AccountsUpdate,
    AccountsResponse,
)


router = APIRouter(prefix="/api/v1", tags=["API"])


def register_crud_routes(
    *,
    path: str,
    name: str,
    model: Type,
    create_schema: Type,
    update_schema: Type,
    response_schema: Type,
    field_map: dict[str, str] | None = None,
):
    @router.get(
        path,
        response_model=list[response_schema],
        response_model_by_alias=False,
        summary=f"List {name}",
    )
    def list_route(
        skip: int = 0,
        limit: int = 100,
        db: Session = Depends(get_db),
    ):
        return crud_service.list_items(
            db=db,
            model=model,
            skip=skip,
            limit=limit,
        )

    @router.get(
        f"{path}/{{item_id}}",
        response_model=response_schema,
        response_model_by_alias=False,
        summary=f"Get {name}",
    )
    def get_route(
        item_id: uuid.UUID,
        db: Session = Depends(get_db),
    ):
        obj = crud_service.get_item(
            db=db,
            model=model,
            item_id=item_id,
        )

        if not obj:
            raise HTTPException(status_code=404, detail=f"{name} not found")

        return obj

    @router.post(
        path,
        response_model=response_schema,
        response_model_by_alias=False,
        summary=f"Create {name}",
    )
    def create_route(
        data: create_schema,
        db: Session = Depends(get_db),
    ):
        return crud_service.create_item(
            db=db,
            model=model,
            data=data,
            field_map=field_map,
        )

    @router.patch(
        f"{path}/{{item_id}}",
        response_model=response_schema,
        response_model_by_alias=False,
        summary=f"Update {name}",
    )
    def update_route(
        item_id: uuid.UUID,
        data: update_schema,
        db: Session = Depends(get_db),
    ):
        obj = crud_service.update_item(
            db=db,
            model=model,
            item_id=item_id,
            data=data,
            field_map=field_map,
        )

        if not obj:
            raise HTTPException(status_code=404, detail=f"{name} not found")

        return obj

    @router.delete(
        f"{path}/{{item_id}}",
        response_model=response_schema,
        response_model_by_alias=False,
        summary=f"Delete {name}",
    )
    def delete_route(
        item_id: uuid.UUID,
        db: Session = Depends(get_db),
    ):
        obj = crud_service.delete_item(
            db=db,
            model=model,
            item_id=item_id,
        )

        if not obj:
            raise HTTPException(status_code=404, detail=f"{name} not found")

        return obj


register_crud_routes(
    path="/shops",
    name="Shop",
    model=Shop,
    create_schema=ShopCreate,
    update_schema=ShopUpdate,
    response_schema=ShopResponse,
)

register_crud_routes(
    path="/shop-users",
    name="Shop User",
    model=ShopUser,
    create_schema=ShopUserCreate,
    update_schema=ShopUserUpdate,
    response_schema=ShopUserResponse,
)

register_crud_routes(
    path="/api-keys",
    name="API Key",
    model=ApiKey,
    create_schema=ApiKeyCreate,
    update_schema=ApiKeyUpdate,
    response_schema=ApiKeyResponse,
)

register_crud_routes(
    path="/products",
    name="Product",
    model=Product,
    create_schema=ProductCreate,
    update_schema=ProductUpdate,
    response_schema=ProductResponse,
    field_map={"metadata": "metadata_"},
)

register_crud_routes(
    path="/product-assets",
    name="Product Asset",
    model=ProductAsset,
    create_schema=ProductAssetCreate,
    update_schema=ProductAssetUpdate,
    response_schema=ProductAssetResponse,
)

register_crud_routes(
    path="/tryon-jobs",
    name="Try-On Job",
    model=TryOnJob,
    create_schema=TryonJobCreate,
    update_schema=TryonJobUpdate,
    response_schema=TryonJobResponse,
)

register_crud_routes(
    path="/usage-events",
    name="Usage Event",
    model=UsageEvent,
    create_schema=UsageEventCreate,
    update_schema=UsageEventUpdate,
    response_schema=UsageEventResponse,
    field_map={"metadata": "metadata_"},
)

register_crud_routes(
    path="/plans",
    name="Plan",
    model=Plan,
    create_schema=PlanCreate,
    update_schema=PlanUpdate,
    response_schema=PlanResponse,
)

register_crud_routes(
    path="/shop-subscriptions",
    name="Shop Subscription",
    model=ShopSubscription,
    create_schema=ShopSubscriptionCreate,
    update_schema=ShopSubscriptionUpdate,
    response_schema=ShopSubscriptionResponse,
)

register_crud_routes(
    path="/monthly-usage",
    name="Monthly Usage",
    model=MonthlyUsage,
    create_schema=MonthlyUsageCreate,
    update_schema=MonthlyUsageUpdate,
    response_schema=MonthlyUsageResponse,
)

register_crud_routes(
    path="/accounts",
    name="Account",
    model=Accounts,
    create_schema=AccountsCreate,
    update_schema=AccountsUpdate,
    response_schema=AccountsResponse,
)
