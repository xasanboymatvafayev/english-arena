from functools import lru_cache
from pathlib import Path

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


BASE_DIR = Path(__file__).resolve().parents[2]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=(".env", "../.env"), env_file_encoding="utf-8", extra="ignore", case_sensitive=False
    )

    app_name: str = "English Arena"
    environment: str = "development"
    api_prefix: str = "/api"

    secret_key: str = "dev-insecure-secret-change-me-please-32chars"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 60 * 24
    refresh_token_expire_days: int = 30

    database_url: str = "postgresql+psycopg://arena:arena_dev_password@127.0.0.1:5432/english_arena"
    app_url: str = "http://localhost:5173"
    cors_origins: str = "http://localhost:5173"

    emailjs_service_id: str = ""
    emailjs_template_id: str = ""
    emailjs_public_key: str = ""
    emailjs_private_key: str = ""
    emailjs_api_url: str = "https://api.emailjs.com/api/v1.0/email/send"
    invitation_expire_days: int = 7

    # Web Push (VAPID). Generate with: python -m app.scripts.generate_vapid_keys
    vapid_public_key: str = ""
    vapid_private_key: str = ""
    vapid_subject: str = "mailto:admin@englisharena.uz"

    upload_dir: str = "uploads"
    max_image_mb: int = 4
    max_book_mb: int = 40
    max_assignment_mb: int = 15

    @field_validator("database_url")
    @classmethod
    def normalize_database_url(cls, value: str) -> str:
        if value.startswith("postgres://"):
            value = "postgresql+psycopg://" + value[len("postgres://") :]
        elif value.startswith("postgresql://"):
            value = "postgresql+psycopg://" + value[len("postgresql://") :]
        return value

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]

    @property
    def upload_path(self) -> Path:
        path = Path(self.upload_dir)
        if not path.is_absolute():
            path = BASE_DIR / path
        path.mkdir(parents=True, exist_ok=True)
        return path

    @property
    def emailjs_configured(self) -> bool:
        return all(
            [self.emailjs_service_id, self.emailjs_template_id, self.emailjs_public_key]
        )


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
