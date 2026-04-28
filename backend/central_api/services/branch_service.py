"""Branch, employee, and shutter-schedule CRUD operations."""

from datetime import date

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..models import Branch, Employee, ShutterWorkingTime
from ..schemas.branch import (
    BranchCreate,
    EmployeeCreate,
    ShutterScheduleCreate,
    ShutterScheduleResponse,
)

# ORM columns on Branch (exclude any legacy / dropped Pydantic-only fields).
_BRANCH_ORM_FIELDS = frozenset({"branch_id", "branch_name", "region", "area"})

_WEEKDAY_NAMES = [
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
    "Sunday",
]


class BranchService:
    # ------------------------------------------------------------------ #
    # Branches
    # ------------------------------------------------------------------ #

    @staticmethod
    async def list_branches(
        db: AsyncSession,
        limit: int = 500,
        offset: int = 0,
    ) -> list[Branch]:
        result = await db.execute(
            select(Branch).order_by(Branch.branch_id).limit(limit).offset(offset)
        )
        return list(result.scalars().all())

    @staticmethod
    async def get_branch(db: AsyncSession, branch_id: int) -> Branch | None:
        result = await db.execute(
            select(Branch).where(Branch.branch_id == branch_id)
        )
        return result.scalar_one_or_none()

    @staticmethod
    async def upsert_branch(db: AsyncSession, payload: BranchCreate) -> Branch:
        result = await db.execute(
            select(Branch).where(Branch.branch_id == payload.branch_id)
        )
        branch = result.scalar_one_or_none()
        data = {
            k: v
            for k, v in payload.model_dump(exclude_unset=True).items()
            if k in _BRANCH_ORM_FIELDS
        }
        if branch:
            for field, value in data.items():
                setattr(branch, field, value)
        else:
            branch = Branch(**data)
            db.add(branch)
        await db.flush()
        await db.refresh(branch)
        return branch

    # ------------------------------------------------------------------ #
    # Employees
    # ------------------------------------------------------------------ #

    @staticmethod
    async def list_employees(
        db: AsyncSession,
        branch_id: int,
        limit: int = 500,
        offset: int = 0,
    ) -> list[Employee]:
        result = await db.execute(
            select(Employee)
            .where(Employee.branch_id == branch_id)
            .order_by(Employee.employee_id)
            .limit(limit)
            .offset(offset)
        )
        return list(result.scalars().all())

    @staticmethod
    async def upsert_employee(
        db: AsyncSession, branch_id: int, payload: EmployeeCreate
    ) -> Employee:
        result = await db.execute(
            select(Employee).where(Employee.employee_id == payload.employee_id)
        )
        emp = result.scalar_one_or_none()
        data = payload.model_dump()
        data["branch_id"] = branch_id
        if emp:
            for field, value in data.items():
                setattr(emp, field, value)
        else:
            emp = Employee(**data)
            db.add(emp)
        await db.flush()
        await db.refresh(emp)
        return emp

    # ------------------------------------------------------------------ #
    # Shutter schedule
    # ------------------------------------------------------------------ #

    @staticmethod
    async def get_shutter_schedule(
        db: AsyncSession,
        branch_id: int,
        day: str,
    ) -> ShutterScheduleResponse | None:
        # Accept either a weekday name ("Tuesday") or an ISO date ("2026-04-14").
        weekday_name = day.strip().title()
        if weekday_name not in _WEEKDAY_NAMES:
            try:
                parsed = date.fromisoformat(day.strip())
                weekday_name = _WEEKDAY_NAMES[parsed.weekday()]
            except ValueError:
                return None

        result = await db.execute(
            select(ShutterWorkingTime)
            .where(
                ShutterWorkingTime.branch_id == branch_id,
                ShutterWorkingTime.weekday == weekday_name,
            )
            .order_by(ShutterWorkingTime.shift_order)
            .limit(1)
        )
        row = result.scalar_one_or_none()
        if row is None:
            return None
        return ShutterScheduleResponse(
            branch_id=branch_id,
            day=weekday_name,
            opening_time=row.shutter_opening_time,
            partial_time=row.shutter_partial_time,
            closing_time=row.shutter_closing_time,
        )

    @staticmethod
    async def upsert_shutter_schedule(
        db: AsyncSession,
        branch_id: int,
        payload: ShutterScheduleCreate,
    ) -> ShutterWorkingTime:
        result = await db.execute(
            select(ShutterWorkingTime).where(
                ShutterWorkingTime.branch_id == branch_id,
                ShutterWorkingTime.weekday == payload.weekday,
                ShutterWorkingTime.shift_order == payload.shift_order,
            )
        )
        row = result.scalar_one_or_none()
        data = payload.model_dump()
        data["branch_id"] = branch_id
        if row:
            for field, value in data.items():
                setattr(row, field, value)
        else:
            row = ShutterWorkingTime(**data)
            db.add(row)
        await db.flush()
        await db.refresh(row)
        return row
