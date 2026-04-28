"""Alert and alert-info endpoints."""

from typing import Annotated

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from ..dependencies import get_db, maybe_require_read_key, require_write_key
from ..schemas.alert import (
    AlertCreate,
    AlertInfoCreate,
    AlertInfoResponse,
    AlertResponse,
)
from ..services.alert_service import AlertService

router = APIRouter(tags=["Alerts"])

_LIMIT = Annotated[int, Query(ge=1, le=500, description="Max 500")]
_OFFSET = Annotated[int, Query(ge=0)]


@router.get("/branches/{branch_id}/alerts", response_model=list[AlertResponse])
async def list_alerts(
    branch_id: int,
    limit: _LIMIT = 100,
    offset: _OFFSET = 0,
    db: AsyncSession = Depends(get_db),
    _: str = Depends(maybe_require_read_key),
) -> list[AlertResponse]:
    rows = await AlertService.list_alerts(db, branch_id=branch_id, limit=limit, offset=offset)
    return [AlertResponse.model_validate(r) for r in rows]


@router.post(
    "/branches/{branch_id}/alerts",
    response_model=AlertResponse,
    status_code=status.HTTP_201_CREATED,
)
async def push_alert(
    branch_id: int,
    payload: AlertCreate,
    db: AsyncSession = Depends(get_db),
    _: str = Depends(require_write_key),
) -> AlertResponse:
    alert = await AlertService.push_alert(db, branch_id, payload)
    return AlertResponse(
        id=alert.alert_id,
        branch_id=alert.branch_id,
        alert_type=alert.alert_type,
        timestamp=alert.timestamp,
        date=alert.date,
        message=None,
    )


@router.get("/alerts/info", response_model=list[AlertInfoResponse])
async def list_alert_info(
    limit: _LIMIT = 500,
    offset: _OFFSET = 0,
    db: AsyncSession = Depends(get_db),
    _: str = Depends(maybe_require_read_key),
) -> list[AlertInfoResponse]:
    rows = await AlertService.list_alert_info(db, limit=limit, offset=offset)
    return [AlertInfoResponse.model_validate(r) for r in rows]


@router.post(
    "/alerts/info",
    response_model=AlertInfoResponse,
    status_code=status.HTTP_201_CREATED,
)
async def upsert_alert_info(
    payload: AlertInfoCreate,
    db: AsyncSession = Depends(get_db),
    _: str = Depends(require_write_key),
) -> AlertInfoResponse:
    row = await AlertService.upsert_alert_info(db, payload)
    return AlertInfoResponse.model_validate(row)
