from pathlib import Path

from dotenv import load_dotenv
from pydantic_settings import BaseSettings, SettingsConfigDict

_ROOT = Path(__file__).resolve().parent.parent.parent
_APP_DIR = _ROOT / "app"

# Env locations:
# - services/api/.env
# - services/api/app/.env
# Nếu cả hai tồn tại, app/.env sẽ ghi đè services/api/.env
_API_ENV = _ROOT / ".env"
_APP_ENV = _APP_DIR / ".env"

if _API_ENV.is_file():
    load_dotenv(_API_ENV)

if _APP_ENV.is_file():
    load_dotenv(_APP_ENV, override=True)

_env_files = tuple(p for p in (_API_ENV, _APP_ENV) if p.is_file()) or (_API_ENV,)


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=_env_files,
        env_file_encoding="utf-8",
        extra="ignore",
    )

    app_name: str = "AI Try-On API"
    debug: bool = False

    # PostgreSQL is required.
    # Example:
    # DATABASE_URL=postgresql+psycopg2://app:app@localhost:5432/ai_tryon
    database_url: str

    redis_url: str = "redis://localhost:6379/0"

    jwt_secret: str = "change-me"
    jwt_algorithm: str = "HS256"
    jwt_expires_minutes: int = 60

    cors_origins: str = (
        "http://127.0.0.1:3000,"
        "http://localhost:3000,"
        "http://127.0.0.1:3001,"
        "http://localhost:3001"
    )

    r2_endpoint_url: str | None = None
    r2_access_key_id: str | None = None
    r2_secret_access_key: str | None = None
    r2_bucket: str | None = None
    r2_public_base_url: str | None = None

    ai_provider: str = "mock"
    ai_api_key: str | None = None

    kling_access_key: str | None = None
    kling_secret_key: str | None = None
    kling_base_url: str = "https://api-singapore.klingai.com"
    kling_vton_model: str = "kolors-virtual-try-on-v1-5"
    kling_callback_url: str | None = None
    kling_timeout_seconds: float = 60.0

    client_reset_password_url: str = "http://localhost:3000/clients/forgetpassword"
    smtp_host: str | None = None
    smtp_port: int = 587
    smtp_user: str | None = None
    smtp_password: str | None = None
    smtp_from: str | None = None


settings = Settings()