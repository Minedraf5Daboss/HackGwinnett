"""Application settings, loaded from environment variables / .env."""

from functools import lru_cache

from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

INSECURE_SECRET = "change-me"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_prefix="APP_", extra="ignore")

    name: str = "app"
    env: str = "development"
    debug: bool = False
    host: str = "127.0.0.1"
    port: int = 8000
    log_level: str = "info"
    cors_origins: list[str] = []

    database_url: str = "sqlite:///./app.db"

    secret_key: str = INSECURE_SECRET
    access_token_expire_minutes: int = 60

    @model_validator(mode="after")
    def _require_secret_in_production(self) -> "Settings":
        if self.env == "production" and self.secret_key == INSECURE_SECRET:
            raise ValueError("APP_SECRET_KEY must be set in production")
        return self


@lru_cache
def get_settings() -> Settings:
    return Settings()
