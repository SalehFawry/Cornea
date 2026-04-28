"""Branch, employee, and shutter-schedule endpoints."""

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from ..dependencies import get_db, maybe_require_read_key, require_write_key
from ..schemas.branch import (
    BranchCreate,
    BranchResponse,
    EmployeeCreate,
    EmployeeResponse,
    ShutterScheduleCreate,
    ShutterScheduleResponse,
)
from ..services.branch_service import BranchService

router = APIRouter(tags=["Branches"])

_LIMIT = Annotated[int, Query(ge=1, le=500, description="Max 500")]
_OFFSET = Annotated[int, Query(ge=0)]


# ------------------------------------------------------------------ #
# Branches
# ------------------------------------------------------------------ #


@router.get("/branches", response_model=list[BranchResponse])
async def list_branches(
    limit: _LIMIT = 500,
    offset: _OFFSET = 0,
    db: AsyncSession = Depends(get_db),
    _: str = Depends(maybe_require_read_key),
) -> list[BranchResponse]:
    branches = await BranchService.list_branches(db, limit=limit, offset=offset)
    return [BranchResponse.model_validate(b) for b in branches]


@router.get("/branches/{branch_id}", response_model=BranchResponse)
async def get_branch(
    branch_id: int,
    db: AsyncSession = Depends(get_db),
    _: str = Depends(maybe_require_read_key),
) -> BranchResponse:
    branch = await BranchService.get_branch(db, branch_id)
    if branch is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Branch not found")
    return BranchResponse.model_validate(branch)


@router.post("/branches", response_model=BranchResponse, status_code=status.HTTP_201_CREATED)
async def upsert_branch(
    payload: BranchCreate,
    db: AsyncSession = Depends(get_db),
    _: str = Depends(require_write_key),
) -> BranchResponse:
    branch = await BranchService.upsert_branch(db, payload)
    return BranchResponse.model_validate(branch)


# ------------------------------------------------------------------ #
# Shutter schedule
# ------------------------------------------------------------------ #


@router.get(
    "/branches/{branch_id}/shutter-schedule",
    response_model=ShutterScheduleResponse,
)
async def get_shutter_schedule(
    branch_id: int,
    day: str = Query(..., description="Weekday name (e.g. 'Tuesday') or ISO date (YYYY-MM-DD)"),
    db: AsyncSession = Depends(get_db),
    _: str = Depends(maybe_require_read_key),
) -> ShutterScheduleResponse:
    schedule = await BranchService.get_shutter_schedule(db, branch_id, day)
    if schedule is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No schedule found for this branch and weekday.",
        )
    return schedule


@router.post(
    "/branches/{branch_id}/shutter-schedule",
    response_model=ShutterScheduleResponse,
    status_code=status.HTTP_201_CREATED,
)
async def upsert_shutter_schedule(
    branch_id: int,
    payload: ShutterScheduleCreate,
    db: AsyncSession = Depends(get_db),
    _: str = Depends(require_write_key),
) -> ShutterScheduleResponse:
    row = await BranchService.upsert_shutter_schedule(db, branch_id, payload)
    return ShutterScheduleResponse(
        branch_id=row.branch_id,
        day=payload.weekday,
        opening_time=row.shutter_opening_time,
        partial_time=row.shutter_partial_time,
        closing_time=row.shutter_closing_time,
    )


# ------------------------------------------------------------------ #
# Employees
# ------------------------------------------------------------------ #


@router.get("/branches/{branch_id}/employees", response_model=list[EmployeeResponse])
async def list_employees(
    branch_id: int,
    limit: _LIMIT = 500,
    offset: _OFFSET = 0,
    db: AsyncSession = Depends(get_db),
    _: str = Depends(maybe_require_read_key),
) -> list[EmployeeResponse]:
    employees = await BranchService.list_employees(db, branch_id, limit=limit, offset=offset)
    return [EmployeeResponse.model_validate(e) for e in employees]


@router.post(
    "/branches/{branch_id}/employees",
    response_model=EmployeeResponse,
    status_code=status.HTTP_201_CREATED,
)
async def upsert_employee(
    branch_id: int,
    payload: EmployeeCreate,
    db: AsyncSession = Depends(get_db),
    _: str = Depends(require_write_key),
) -> EmployeeResponse:
    emp = await BranchService.upsert_employee(db, branch_id, payload)
    return EmployeeResponse.model_validate(emp)
