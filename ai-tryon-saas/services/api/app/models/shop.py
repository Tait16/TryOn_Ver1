import uuid
from datetime import datetime

from sqlalchemy import DateTime, String, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base
from app.models.datetime_defaults import utc_now


class Shop(Base):
    __tablename__ = "shops"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )

    name: Mapped[str] = mapped_column(String(255), nullable=False)
    domain: Mapped[str | None] = mapped_column(String(255), nullable=True)
    status: Mapped[str] = mapped_column(String(50), nullable=False, default="active")
    plan: Mapped[str] = mapped_column(String(50), nullable=False, default="pilot")

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

    users = relationship("ShopUser", back_populates="shop", cascade="all, delete-orphan")
    api_keys = relationship("ApiKey", back_populates="shop", cascade="all, delete-orphan")
    products = relationship("Product", back_populates="shop", cascade="all, delete-orphan")
    tryon_jobs = relationship("TryOnJob", back_populates="shop", cascade="all, delete-orphan")
    usage_events = relationship("UsageEvent", back_populates="shop", cascade="all, delete-orphan")
    subscriptions = relationship("ShopSubscription", back_populates="shop", cascade="all, delete-orphan")
    monthly_usages = relationship("MonthlyUsage", back_populates="shop", cascade="all, delete-orphan")