import uuid
from datetime import datetime
from decimal import Decimal

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, Numeric, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base
from app.models.datetime_defaults import utc_now


class TryOnJob(Base):
    __tablename__ = "tryon_jobs"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )

    shop_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("shops.id"),
        nullable=False,
    )

    product_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("products.id"),
        nullable=False,
    )

    user_image_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    result_image_url: Mapped[str | None] = mapped_column(Text, nullable=True)

    status: Mapped[str] = mapped_column(String(50), nullable=False, default="queued")
    validation_status: Mapped[str | None] = mapped_column(String(50), nullable=True)

    error_code: Mapped[str | None] = mapped_column(String(100), nullable=True)
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)

    processing_time_ms: Mapped[int | None] = mapped_column(Integer, nullable=True)
    ai_cost_usd: Mapped[Decimal | None] = mapped_column(Numeric(10, 4), nullable=True)

    is_billable: Mapped[bool] = mapped_column(Boolean, default=False)

    visitor_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
    client_ip_hash: Mapped[str | None] = mapped_column(Text, nullable=True)
    user_agent: Mapped[str | None] = mapped_column(Text, nullable=True)

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

    shop = relationship("Shop", back_populates="tryon_jobs")
    product = relationship("Product", back_populates="tryon_jobs")
    usage_events = relationship("UsageEvent", back_populates="tryon_job")