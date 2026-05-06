import uuid
from datetime import datetime
from typing import Any

from sqlalchemy import Boolean, DateTime, ForeignKey, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base
from app.models.datetime_defaults import utc_now


class ShopWidgetSettings(Base):
    __tablename__ = "shop_widget_settings"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )

    shop_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("shops.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
        index=True,
    )

    logo_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    cover_image_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    fallback_product_image_url: Mapped[str | None] = mapped_column(Text, nullable=True)

    primary_color: Mapped[str] = mapped_column(String(7), nullable=False, default="#2563EB")
    button_color: Mapped[str] = mapped_column(String(7), nullable=False, default="#111827")
    background_color: Mapped[str] = mapped_column(String(7), nullable=False, default="#FFFFFF")
    text_color: Mapped[str] = mapped_column(String(7), nullable=False, default="#0F172A")

    headline: Mapped[str] = mapped_column(String(120), nullable=False, default="Thử đồ AI trước khi mua")
    subheadline: Mapped[str] = mapped_column(
        String(240),
        nullable=False,
        default="Upload ảnh của bạn và xem sản phẩm phù hợp thế nào",
    )
    tryon_button_text: Mapped[str] = mapped_column(String(40), nullable=False, default="Thử đồ AI")
    buy_button_text: Mapped[str] = mapped_column(String(40), nullable=False, default="Mua ngay")

    show_price: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    show_buy_button: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    default_product_sort: Mapped[str] = mapped_column(String(30), nullable=False, default="latest")

    metadata_: Mapped[dict[str, Any]] = mapped_column("metadata", JSONB, nullable=False, default=dict)

    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        server_default=func.now(),
        default=utc_now,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        server_default=func.now(),
        onupdate=utc_now,
        default=utc_now,
    )

    shop = relationship("Shop", back_populates="shop_widget_settings")
