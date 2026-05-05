import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base
from app.models.datetime_defaults import utc_now


class MonthlyUsage(Base):
    __tablename__ = "monthly_usage"

    __table_args__ = (
        UniqueConstraint("shop_id", "year_month", name="uq_monthly_usage_shop_year_month"),
    )

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

    year_month: Mapped[str] = mapped_column(String(7), nullable=False)

    billable_tryons: Mapped[int] = mapped_column(Integer, default=0)
    total_tryon_requests: Mapped[int] = mapped_column(Integer, default=0)
    failed_tryons: Mapped[int] = mapped_column(Integer, default=0)
    rejected_tryons: Mapped[int] = mapped_column(Integer, default=0)

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

    shop = relationship("Shop", back_populates="monthly_usages")