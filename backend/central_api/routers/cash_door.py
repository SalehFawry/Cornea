"""Cash-door events endpoints."""

from datetime import date
from typing import Annotated

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from ..dependencies import get_db, maybe_require_read_key, require_write_key
from ..schemas.cash_door import (
    CashDoorEventCreate,
    CashDoorEventResponse,
    CashDoorStatusResponse,
)
from ..services.cash_door_service import CashDoorService

router = APIRouter(tags=["Cash Door"])

_LIMIT = Annotated[int, Query(ge=1, le=500, description="Max 500")]
_OFFSET = Annotated[int, Query(ge=0)]


@router.get(
    "/branches/{branch_id}/cash-door/events",
    response_model=list[CashDoorEventResponse],
)
async def list_cash_door_events(
    branch_id: int,
    limit: _LIMIT = 100,
    offset: _OFFSET = 0,
    date: date | None = Query(None),
    db: AsyncSession = Depends(get_db),
    _: str = Depends(maybe_require_read_key),
) -> list[CashDoorEventResponse]:
    rows = await CashDoorService.list_events(
        db, branch_id=branch_id, limit=limit, offset=offset, filter_date=date
    )
    return [CashDoorEventResponse.model_validate(r) for r in rows]


@router.get(
    "/branches/{branch_id}/cash-door/status",
    response_model=CashDoorStatusResponse,
)
async def cash_door_status(
    branch_id: int,
    db: AsyncSession = Depends(get_db),
    _: str = Depends(maybe_require_read_key),
) -> CashDoorStatusResponse:
    return await CashDoorService.get_status(db, branch_id)


@router.post(
    "/branches/{branch_id}/cash-door/events",
    response_model=CashDoorEventResponse,
    status_code=status.HTTP_201_CREATED,
)
async def push_cash_door_event(
    branch_id: int,
    payload: CashDoorEventCreate,
    db: AsyncSession = Depends(get_db),
    _: str = Depends(require_write_key),
) -> CashDoorEventResponse:
    row = await CashDoorService.push_event(db, branch_id, payload)
    return CashDoorEventResponse.model_validate(row)
