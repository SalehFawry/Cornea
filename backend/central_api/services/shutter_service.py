"""Shutter-events service."""

from datetime import date, datetime

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from ..models import ShutterEvent
from ..schemas.shutter import ShutterEventCreate, ShutterStatusResponse


def _is_pk_duplicate_error(exc: IntegrityError) -> bool:
    orig = getattr(exc, "orig", None)
    text = str(orig) if orig is not None else str(exc)
    return "ORA-00001" in text


class ShutterService:

    @staticmethod
    async def list_events(
        db: AsyncSession,
        branch_id: int,
        limit: int = 100,
        offset: int = 0,
        filter_date: date | None = None,
    ) -> list[dict]:
        stmt = select(ShutterEvent).where(ShutterEvent.branch_id == branch_id)
        if filter_date:
            stmt = stmt.where(ShutterEvent.date == filter_date)
        stmt = (
            stmt.order_by(ShutterEvent.event_time.desc()).limit(limit).offset(offset)
        )
        result = await db.execute(stmt)
        rows = result.scalars().all()
        return [
            {
                "id": idx + offset + 1,
                "branch_id": r.branch_id,
                "event_type": r.event_type,
                "timestamp": r.event_time,
                "date": r.date,
            }
            for idx, r in enumerate(rows)
        ]

    @staticmethod
    async def get_status(
        db: AsyncSession,
        branch_id: int,
    ) -> ShutterStatusResponse:
        result = await db.execute(
            select(ShutterEvent)
            .where(ShutterEvent.branch_id == branch_id)
            .order_by(ShutterEvent.event_time.desc())
            .limit(1)
        )
        latest = result.scalar_one_or_none()
        return ShutterStatusResponse(
            branch_id=branch_id,
            latest_event_type=latest.event_type if latest else None,
            latest_timestamp=latest.event_time if latest else None,
        )

    @staticmethod
    def _event_dict(branch_id: int, row: ShutterEvent) -> dict:
        return {
            "id": 0,
            "branch_id": branch_id,
            "event_type": row.event_type,
            "timestamp": row.event_time,
            "date": row.date,
            "confidence": getattr(row, "confidence", None),
            "model_version": getattr(row, "model_version", None),
        }

    @staticmethod
    async def push_event(
        db: AsyncSession,
        branch_id: int,
        payload: ShutterEventCreate,
    ) -> dict:
        event_time = payload.event_time
        if event_time.tzinfo is not None:
            # Strip tzinfo for storage; Oracle TIMESTAMP has no TZ.
            event_time = event_time.replace(tzinfo=None)

        event_date = payload.date or event_time.date()
        stmt = select(ShutterEvent).where(
            ShutterEvent.branch_id == branch_id,
            ShutterEvent.event_type == payload.event_type,
            ShutterEvent.event_time == event_time,
        )
        existing = (await db.execute(stmt)).scalar_one_or_none()
        if existing is not None:
            return ShutterService._event_dict(branch_id, existing)

        row = ShutterEvent(
            branch_id=branch_id,
            event_type=payload.event_type,
            event_time=event_time,
            date=event_date,
            confidence=payload.confidence,
            model_version=payload.model_version,
        )
        db.add(row)
        try:
            await db.flush()
        except IntegrityError as exc:
            if not _is_pk_duplicate_error(exc):
                raise
            await db.rollback()
            existing = (await db.execute(stmt)).scalar_one_or_none()
            if existing is None:
                raise exc
            return ShutterService._event_dict(branch_id, existing)

        return ShutterService._event_dict(branch_id, row)
