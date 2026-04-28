"""Alert and alert-info service."""

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..models import Alert, AlertInfo
from ..schemas.alert import AlertCreate, AlertInfoCreate


class AlertService:

    @staticmethod
    async def list_alerts(
        db: AsyncSession,
        branch_id: int,
        limit: int = 100,
        offset: int = 0,
    ) -> list[dict]:
        stmt = (
            select(Alert, AlertInfo.description)
            .join(AlertInfo, AlertInfo.alert_type == Alert.alert_type, isouter=True)
            .where(Alert.branch_id == branch_id)
            .order_by(Alert.timestamp.desc())
            .limit(limit)
            .offset(offset)
        )
        result = await db.execute(stmt)
        rows = result.all()
        return [
            {
                "id": alert.alert_id,
                "branch_id": alert.branch_id,
                "alert_type": alert.alert_type,
                "timestamp": alert.timestamp,
                "date": alert.date,
                "message": description,
            }
            for alert, description in rows
        ]

    @staticmethod
    async def push_alert(
        db: AsyncSession,
        branch_id: int,
        payload: AlertCreate,
    ) -> Alert:
        result = await db.execute(
            select(Alert).where(Alert.alert_id == payload.alert_id)
        )
        existing = result.scalar_one_or_none()
        ts = payload.timestamp
        if ts.tzinfo is not None:
            ts = ts.replace(tzinfo=None)

        if existing:
            existing.branch_id = branch_id
            existing.alert_type = payload.alert_type
            existing.timestamp = ts
            existing.date = payload.date or ts.date()
        else:
            existing = Alert(
                alert_id=payload.alert_id,
                branch_id=branch_id,
                alert_type=payload.alert_type,
                timestamp=ts,
                date=payload.date or ts.date(),
            )
            db.add(existing)
        await db.flush()
        await db.refresh(existing)
        return existing

    # ------------------------------------------------------------------ #
    # Alert info (reference data)
    # ------------------------------------------------------------------ #

    @staticmethod
    async def list_alert_info(
        db: AsyncSession,
        limit: int = 500,
        offset: int = 0,
    ) -> list[AlertInfo]:
        result = await db.execute(
            select(AlertInfo)
            .order_by(AlertInfo.alert_type)
            .limit(limit)
            .offset(offset)
        )
        return list(result.scalars().all())

    @staticmethod
    async def upsert_alert_info(
        db: AsyncSession,
        payload: AlertInfoCreate,
    ) -> AlertInfo:
        result = await db.execute(
            select(AlertInfo).where(AlertInfo.alert_type == payload.alert_type)
        )
        row = result.scalar_one_or_none()
        if row:
            for field, value in payload.model_dump(exclude_unset=True).items():
                setattr(row, field, value)
        else:
            row = AlertInfo(**payload.model_dump())
            db.add(row)
        await db.flush()
        await db.refresh(row)
        return row
