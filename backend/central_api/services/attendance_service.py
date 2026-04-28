"""Attendance service — implements the additive upsert pattern.

Additive upsert rules (per branch_id + employee_id + date):
  - EXISTS  → add disk_hours, add total_hours,
               keep min(first_time_seen), keep max(last_time_seen)
  - MISSING → INSERT new record
"""

from datetime import date

from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from ..models import Attendance, Branch
from .integrity_errors import maybe_raise_409_for_fk_violation
from ..schemas.attendance import AttendanceSyncItem


class AttendanceService:

    @staticmethod
    async def list_attendance(
        db: AsyncSession,
        branch_id: int,
        limit: int = 100,
        offset: int = 0,
        filter_date: date | None = None,
        employee_id: int | None = None,
    ) -> list[dict]:
        stmt = (
            select(
                Attendance.employee_id,
                Attendance.branch_id,
                Attendance.date,
                Attendance.first_time_seen,
                Attendance.last_time_seen,
                Attendance.disk_hours,
                Attendance.total_hours,
                Attendance.camera_id,
                Branch.branch_name,
            )
            .join(Branch, Branch.branch_id == Attendance.branch_id, isouter=True)
            .where(Attendance.branch_id == branch_id)
        )
        if filter_date:
            stmt = stmt.where(Attendance.date == filter_date)
        if employee_id is not None:
            stmt = stmt.where(Attendance.employee_id == employee_id)

        stmt = (
            stmt.order_by(Attendance.date.desc(), Attendance.employee_id)
            .limit(limit)
            .offset(offset)
        )
        result = await db.execute(stmt)
        rows = result.mappings().all()

        return [
            {
                "employee_id": r["employee_id"],
                "branch_id": r["branch_id"],
                "date": r["date"],
                "first_time_seen": r["first_time_seen"],
                "last_time_seen": r["last_time_seen"],
                "working_hours": r["total_hours"],
                "disk_hours": r["disk_hours"],
                "total_hours": r["total_hours"],
                "camera_id": r["camera_id"],
                "branch_name": r["branch_name"],
            }
            for r in rows
        ]

    @staticmethod
    async def summarise_attendance(
        db: AsyncSession,
        branch_id: int,
        date_from: date,
        date_to: date,
    ) -> list[dict]:
        stmt = (
            select(
                Attendance.employee_id,
                func.sum(Attendance.total_hours).label("total_hours"),
                func.avg(Attendance.total_hours).label("avg_hours"),
                func.count(Attendance.date).label("days_present"),
                func.min(Attendance.first_time_seen).label("first_time_seen"),
                func.max(Attendance.last_time_seen).label("last_time_seen"),
            )
            .where(
                Attendance.branch_id == branch_id,
                Attendance.date >= date_from,
                Attendance.date <= date_to,
            )
            .group_by(Attendance.employee_id)
            .order_by(Attendance.employee_id)
        )
        result = await db.execute(stmt)
        rows = result.mappings().all()
        return [dict(r) for r in rows]

    # ------------------------------------------------------------------ #
    # Additive upsert
    # ------------------------------------------------------------------ #

    @staticmethod
    async def sync_record(
        db: AsyncSession,
        item: AttendanceSyncItem,
    ) -> Attendance:
        result = await db.execute(
            select(Attendance).where(
                Attendance.branch_id == item.branch_id,
                Attendance.employee_id == item.employee_id,
                Attendance.date == item.date,
            )
        )
        existing = result.scalar_one_or_none()

        if existing:
            # Additive accumulation
            existing.disk_hours = (existing.disk_hours or 0.0) + (item.disk_hours or 0.0)
            existing.total_hours = (existing.total_hours or 0.0) + (item.total_hours or 0.0)

            new_first = item.first_time_seen
            if new_first is not None:
                existing_first = existing.first_time_seen
                existing.first_time_seen = (
                    new_first if existing_first is None else min(existing_first, new_first)
                )

            new_last = item.last_time_seen
            if new_last is not None:
                existing_last = existing.last_time_seen
                existing.last_time_seen = (
                    new_last if existing_last is None else max(existing_last, new_last)
                )
            if existing.camera_id is None and item.camera_id is not None:
                existing.camera_id = item.camera_id
        else:
            existing = Attendance(
                branch_id=item.branch_id,
                employee_id=item.employee_id,
                date=item.date,
                first_time_seen=item.first_time_seen,
                last_time_seen=item.last_time_seen,
                disk_hours=item.disk_hours,
                total_hours=item.total_hours,
                camera_id=item.camera_id,
            )
            db.add(existing)

        try:
            await db.flush()
        except IntegrityError as exc:
            maybe_raise_409_for_fk_violation(exc)
            raise
        await db.refresh(existing)
        return existing

    @staticmethod
    async def sync_batch(
        db: AsyncSession,
        branch_id: int,
        items: list[AttendanceSyncItem],
    ) -> list[Attendance]:
        results = []
        for item in items:
            # Override branch_id from the URL path to prevent spoofing.
            item = item.model_copy(update={"branch_id": branch_id})
            results.append(await AttendanceService.sync_record(db, item))
        return results
