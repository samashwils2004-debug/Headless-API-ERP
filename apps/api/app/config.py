"""AdmitFlow settings."""
from functools import lru_cache
from pathlib import Path
from typing import Literal

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

BASE_DIR = Path(__file__).resolve().parents[1]


class Settings(BaseSettings):
    environment: Literal["development", "staging", "production"] = "development"
    debug: bool = False

    app_name: str = "AdmitFlow"
    app_version: str = "2.0.0"

    database_url: str = f"sqlite:///{(BASE_DIR / 'admissions.db').as_posix()}"
    db_echo: bool = False
    db_pool_size: int = 5
    db_max_overflow: int = 10
    db_pool_timeout: int = 30
    db_pool_recycle: int = 1800
    db_statement_timeout_ms: int = 30000

    redis_url: str = ""

    secret_key: str = "CHANGE_ME_USE_ENV"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 30
    refresh_token_expire_days: int = 30
    bcrypt_rounds: int = 12

    cors_origins: list[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ]
    console_origin: str = "http://localhost:3000"

    openai_api_key: str = ""
    openai_model: str = "gpt-4-turbo"

    sentry_dsn: str = ""

    @field_validator("secret_key")
    @classmethod
    def validate_secret_key(cls, value: str, info):
        if info.data.get("environment") == "production" and (not value or len(value) < 32 or value == "CHANGE_ME_USE_ENV"):
            raise ValueError("SECRET_KEY must be at least 32 chars in production")
        return value

    @field_validator("database_url")
    @classmethod
    def validate_database_url(cls, value: str, info):
        if info.data.get("environment") == "production" and "sqlite" in value.lower():
            raise ValueError("Production requires PostgreSQL")
        return value

    model_config = SettingsConfigDict(env_file=".env", case_sensitive=False)


@lru_cache
def get_settings() -> Settings:
    return Settings()

