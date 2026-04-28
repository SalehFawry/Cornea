from datetime import date as Date, datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict


class CustomerResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    customer_id: Optional[str] = None
    branch_id: Optional[int] = None
    date: Optional[Date] = None
    # first_time_seen → visit_start_time, last_time_seen → service_end_time
    visit_start_time: Optional[datetime] = None
    service_end_time: Optional[datetime] = None
    waiting_time: Optional[float] = None
    service_time: Optional[float] = None
    camera_id: Optional[str] = None
    branch_name: Optional[str] = None


class CustomerSummaryResponse(BaseModel):
    date: Optional[Date] = None
    branch_id: Optional[int] = None
    total_customers: Optional[int] = None
    avg_waiting_time: Optional[float] = None
    avg_service_time: Optional[float] = None


class CustomerSyncItem(BaseModel):
    """A single customer visit record pushed by the CVPC server."""

    branch_id: int
    customer_id: str
    date: Date
    first_time_seen: Optional[datetime] = None
    last_time_seen: Optional[datetime] = None
    service_time: Optional[float] = None
    waiting_time: Optional[float] = None
    camera_id: Optional[str] = None


class CustomerSyncPayload(BaseModel):
    records: list[CustomerSyncItem]
