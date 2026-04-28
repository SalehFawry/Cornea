"""Shutter-events endpoints."""

from datetime import date
from typing import Annotated

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from ..dependencies import get_db, maybe_require_read_key, require_write_key
from ..schemas.shutter import (
    ShutterEventCreate,
    ShutterEventResponse,
    ShutterStatusResponse,
)
from ..services.shutter_service import ShutterService

router = APIRouter(tags=["Shutter"])

_LIMIT = Annotated[int, Query(ge=1, le=500, description="Max 500")]
_OFFSET = Annotated[int, Query(ge=0)]


@router.get(
    "/branches/{branch_id}/shutter/events",
    response_model=list[ShutterEventResponse],
)
async def list_shutter_events(
    branch_id: int,
    limit: _LIMIT = 100,
    offset: _OFFSET = 0,
    date: date | None = Query(None),
    db: AsyncSession = Depends(get_db),
    _: str = Depends(maybe_require_read_key),
) -> list[ShutterEventResponse]:
    rows = await ShutterService.list_events(
        db, branch_id=branch_id, limit=limit, offset=offset, filter_date=date
    )
    return [ShutterEventResponse.model_validate(r) for r in rows]


@router.get(
    "/branches/{branch_id}/shutter/status",
    response_model=ShutterStatusResponse,
)
async def shutter_status(
    branch_id: int,
    db: AsyncSession = Depends(get_db),
    _: str = Depends(maybe_require_read_key),
) -> ShutterStatusResponse:
    return await ShutterService.get_status(db, branch_id)


@router.post(
    "/branches/{branch_id}/shutter/events",
    response_model=ShutterEventResponse,
    status_code=status.HTTP_201_CREATED,
)
async def push_shutter_event(
    branch_id: int,
    payload: ShutterEventCreate,
    db: AsyncSession = Depends(get_db),
    _: str = Depends(require_write_key),
) -> ShutterEventResponse:
    row = await ShutterService.push_event(db, branch_id, payload)
    return ShutterEventResponse.model_validate(row)
