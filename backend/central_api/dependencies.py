"""FastAPI dependency injectors for DB sessions and API-key auth."""

import hmac
from typing import AsyncGenerator

from fastapi import Depends, HTTPException, Security, status
from fastapi.security.api_key import APIKeyHeader
from sqlalchemy.ext.asyncio import AsyncSession

from .config import Settings, get_settings
from .database import AsyncSessionLocal

_API_KEY_HEADER = APIKeyHeader(name="X-API-Key", auto_error=False)


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """Yield a transactional async DB session; rolls back on error."""
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise


def _require_api_key(
    api_key: str | None = Security(_API_KEY_HEADER),
    settings: Settings = Depends(get_settings),
) -> str:
    configured = settings.api_key
    if not configured:
        # No key configured → open access (dev/staging mode).
        return ""
    if not hmac.compare_digest(api_key or "", configured):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Invalid or missing X-API-Key header.",
        )
    return api_key


def require_write_key(
    api_key: str = Depends(_require_api_key),
) -> str:
    """Enforce API key on every mutating endpoint."""
    return api_key


def maybe_require_read_key(
    api_key: str | None = Security(_API_KEY_HEADER),
    settings: Settings = Depends(get_settings),
) -> str:
    """Enforce API key on read endpoints only when REQUIRE_API_KEY_FOR_READS=true."""
    if settings.require_api_key_for_reads:
        return _require_api_key(api_key, settings)
    return ""
