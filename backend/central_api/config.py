"""Configuration for the Central DB FastAPI service.

Uses pydantic-settings for DATABASE_URL, API_KEY, and optional
REQUIRE_API_KEY_FOR_READS (dev mode).
"""

from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

# Resolve backend root (parent of central_api) so .env is always loaded from backend/
_BACKEND_ROOT = Path(__file__).resolve().parent.parent
_ENV_FILE = _BACKEND_ROOT / ".env"


class Settings(BaseSettings):
    """Application settings loaded from environment or .env."""

    model_config = SettingsConfigDict(
        env_file=_ENV_FILE if _ENV_FILE.exists() else ".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    database_url: str = "sqlite+aiosqlite:///./central.db"
    api_key: str = ""
    require_api_key_for_reads: bool = False

    # Comma-separated list of allowed CORS origins, or "*" for open access.
    # The production Nginx origin is included by default.
    cors_origins: str = "https://ngnx-fawryplus.fawrypayments.com:9110"


@lru_cache
def get_settings() -> Settings:
    """Return the application settings instance (cached for the process lifetime)."""
    return Settings()
