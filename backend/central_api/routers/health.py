"""Health and readiness probe endpoints."""

from fastapi import APIRouter, Depends
from sqlalchemy import literal, select
from sqlalchemy.ext.asyncio import AsyncSession

from ..dependencies import get_db

router = APIRouter(tags=["Health"])


@router.get("/health", include_in_schema=False)
async def health() -> dict:
    """Liveness probe — always 200 if the process is up."""
    return {"status": "ok"}


@router.get("/ready", include_in_schema=False)
async def ready(db: AsyncSession = Depends(get_db)) -> dict:
    """Readiness probe — verifies DB connectivity.

    Uses select(literal(1)) which SQLAlchemy compiles dialect-correctly:
      Oracle  → SELECT 1 FROM DUAL
      Others  → SELECT 1
    No raw SQL strings, no dialect branching needed here.
    """
    await db.execute(select(literal(1)))
    return {"status": "ready", "db": "connected"}
