"""Attendance endpoints — list, summary, and additive-upsert sync."""

from datetime import date
from typing import Annotated

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from ..dependencies import get_db, maybe_require_read_key, require_write_key
from ..summary_date_range import resolve_summary_dates
from ..schemas.attendance import (
    AttendanceResponse,
    AttendanceSummaryResponse,
    AttendanceSyncPayload,
)
from ..services.attendance_service import AttendanceService

router = APIRouter(tags=["Attendance"])

_LIMIT = Annotated[int, Query(ge=1, le=500, description="Max 500")]
_OFFSET = Annotated[int, Query(ge=0)]


@router.get(
    "/branches/{branch_id}/attendance",
    response_model=list[AttendanceResponse],
)
async def list_attendance(
    branch_id: int,
    limit: _LIMIT = 100,
    offset: _OFFSET = 0,
    date: date | None = Query(None, description="Filter by date (YYYY-MM-DD)"),
    employee_id: int | None = Query(None),
    db: AsyncSession = Depends(get_db),
    _: str = Depends(maybe_require_read_key),
) -> list[AttendanceResponse]:
    rows = await AttendanceService.list_attendance(
        db,
        branch_id=branch_id,
        limit=limit,
        offset=offset,
        filter_date=date,
        employee_id=employee_id,
    )
    return [AttendanceResponse.model_validate(r) for r in rows]


@router.get(
    "/branches/{branch_id}/attendance/summary",
    response_model=list[AttendanceSummaryResponse],
)
async def attendance_summary(
    branch_id: int,
    date_from: date | None = Query(
        None,
        description="Inclusive start (YYYY-MM-DD). Defaults to 30 days before date_to.",
    ),
    date_to: date | None = Query(
        None,
        description="Inclusive end (YYYY-MM-DD). Defaults to today.",
    ),
    db: AsyncSession = Depends(get_db),
    _: str = Depends(maybe_require_read_key),
) -> list[AttendanceSummaryResponse]:
    date_from, date_to = resolve_summary_dates(date_from, date_to)
    rows = await AttendanceService.summarise_attendance(db, branch_id, date_from, date_to)
    return [AttendanceSummaryResponse.model_validate(r) for r in rows]


@router.post(
    "/branches/{branch_id}/attendance/sync",
    status_code=status.HTTP_200_OK,
)
async def sync_attendance(
    branch_id: int,
    payload: AttendanceSyncPayload,
    db: AsyncSession = Depends(get_db),
    _: str = Depends(require_write_key),
) -> dict:
    records = await AttendanceService.sync_batch(db, branch_id, payload.records)
    return {"synced": len(records)}
