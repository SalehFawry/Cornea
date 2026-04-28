"""Async SQLAlchemy engine and session factory.

Supports oracle+oracledb, postgresql+asyncpg, and sqlite+aiosqlite URLs
without any dialect-specific branching in the application code.
"""

from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

from .config import get_settings

_settings = get_settings()

# pool_pre_ping keeps connections healthy across long idle periods.
# pool_recycle prevents stale connections on Oracle/Postgres.
engine = create_async_engine(
    _settings.database_url,
    pool_pre_ping=True,
    pool_recycle=1800,
    echo=False,
)

AsyncSessionLocal: async_sessionmaker[AsyncSession] = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
)
