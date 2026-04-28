"""Customer endpoints — list, summary, and additive-upsert sync."""

from datetime import date
from typing import Annotated

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from ..dependencies import get_db, maybe_require_read_key, require_write_key
from ..summary_date_range import resolve_summary_dates
from ..schemas.customer import (
    CustomerResponse,
    CustomerSummaryResponse,
    CustomerSyncPayload,
)
from ..services.customer_service import CustomerService

router = APIRouter(tags=["Customers"])

_LIMIT = Annotated[int, Query(ge=1, le=500, description="Max 500")]
_OFFSET = Annotated[int, Query(ge=0)]


@router.get(
    "/branches/{branch_id}/customers",
    response_model=list[CustomerResponse],
)
async def list_customers(
    branch_id: int,
    limit: _LIMIT = 100,
    offset: _OFFSET = 0,
    date: date | None = Query(None, description="Filter by date (YYYY-MM-DD)"),
    customer_id: str | None = Query(None),
    db: AsyncSession = Depends(get_db),
    _: str = Depends(maybe_require_read_key),
) -> list[CustomerResponse]:
    rows = await CustomerService.list_customers(
        db,
        branch_id=branch_id,
        limit=limit,
        offset=offset,
        filter_date=date,
        customer_id=customer_id,
    )
    return [CustomerResponse.model_validate(r) for r in rows]


@router.get(
    "/branches/{branch_id}/customers/summary",
    response_model=list[CustomerSummaryResponse],
)
async def customer_summary(
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
) -> list[CustomerSummaryResponse]:
    date_from, date_to = resolve_summary_dates(date_from, date_to)
    rows = await CustomerService.summarise_customers(db, branch_id, date_from, date_to)
    return [CustomerSummaryResponse.model_validate(r) for r in rows]


@router.post(
    "/branches/{branch_id}/customers/sync",
    status_code=status.HTTP_200_OK,
)
async def sync_customers(
    branch_id: int,
    payload: CustomerSyncPayload,
    db: AsyncSession = Depends(get_db),
    _: str = Depends(require_write_key),
) -> dict:
    records = await CustomerService.sync_batch(db, branch_id, payload.records)
    return {"synced": len(records)}
