"""Customer service — implements the additive upsert pattern.

Additive upsert rules (per branch_id + customer_id + date):
  - EXISTS  → add service_time, add waiting_time,
               keep min(first_time_seen), keep max(last_time_seen)
  - MISSING → INSERT new record
"""

from datetime import date

from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from ..models import Branch, Customer
from .integrity_errors import maybe_raise_409_for_fk_violation
from ..schemas.customer import CustomerSyncItem


class CustomerService:

    @staticmethod
    async def list_customers(
        db: AsyncSession,
        branch_id: int,
        limit: int = 100,
        offset: int = 0,
        filter_date: date | None = None,
        customer_id: str | None = None,
    ) -> list[dict]:
        stmt = (
            select(
                Customer.customer_id,
                Customer.branch_id,
                Customer.date,
                Customer.first_time_seen,
                Customer.last_time_seen,
                Customer.service_time,
                Customer.waiting_time,
                Customer.camera_id,
                Branch.branch_name,
            )
            .join(Branch, Branch.branch_id == Customer.branch_id, isouter=True)
            .where(Customer.branch_id == branch_id)
        )
        if filter_date:
            stmt = stmt.where(Customer.date == filter_date)
        if customer_id is not None:
            stmt = stmt.where(Customer.customer_id == customer_id)

        stmt = (
            stmt.order_by(Customer.date.desc(), Customer.customer_id)
            .limit(limit)
            .offset(offset)
        )
        result = await db.execute(stmt)
        rows = result.mappings().all()

        return [
            {
                "customer_id": r["customer_id"],
                "branch_id": r["branch_id"],
                "date": r["date"],
                "visit_start_time": r["first_time_seen"],
                "service_end_time": r["last_time_seen"],
                "waiting_time": r["waiting_time"],
                "service_time": r["service_time"],
                "camera_id": r["camera_id"],
                "branch_name": r["branch_name"],
            }
            for r in rows
        ]

    @staticmethod
    async def summarise_customers(
        db: AsyncSession,
        branch_id: int,
        date_from: date,
        date_to: date,
    ) -> list[dict]:
        stmt = (
            select(
                Customer.date,
                Customer.branch_id,
                func.count(Customer.id).label("total_customers"),
                func.avg(Customer.waiting_time).label("avg_waiting_time"),
                func.avg(Customer.service_time).label("avg_service_time"),
            )
            .where(
                Customer.branch_id == branch_id,
                Customer.date >= date_from,
                Customer.date <= date_to,
            )
            .group_by(Customer.date, Customer.branch_id)
            .order_by(Customer.date)
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
        item: CustomerSyncItem,
    ) -> Customer:
        result = await db.execute(
            select(Customer).where(
                Customer.branch_id == item.branch_id,
                Customer.customer_id == item.customer_id,
                Customer.date == item.date,
            )
        )
        existing = result.scalar_one_or_none()

        if existing:
            existing.service_time = (existing.service_time or 0.0) + (item.service_time or 0.0)
            existing.waiting_time = (existing.waiting_time or 0.0) + (item.waiting_time or 0.0)

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
            existing = Customer(
                branch_id=item.branch_id,
                customer_id=item.customer_id,
                date=item.date,
                first_time_seen=item.first_time_seen,
                last_time_seen=item.last_time_seen,
                service_time=item.service_time,
                waiting_time=item.waiting_time,
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
        items: list[CustomerSyncItem],
    ) -> list[Customer]:
        results = []
        for item in items:
            item = item.model_copy(update={"branch_id": branch_id})
            results.append(await CustomerService.sync_record(db, item))
        return results
