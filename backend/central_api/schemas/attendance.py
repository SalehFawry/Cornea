from datetime import date as Date, datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict


class AttendanceResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    employee_id: Optional[int] = None
    branch_id: Optional[int] = None
    date: Optional[Date] = None
    first_time_seen: Optional[datetime] = None
    last_time_seen: Optional[datetime] = None
    # working_hours mirrors total_hours; populated by the service layer.
    working_hours: Optional[float] = None
    disk_hours: Optional[float] = None
    total_hours: Optional[float] = None
    camera_id: Optional[str] = None
    branch_name: Optional[str] = None


class AttendanceSummaryResponse(BaseModel):
    employee_id: Optional[int] = None
    total_hours: Optional[float] = None
    avg_hours: Optional[float] = None
    days_present: Optional[int] = None
    first_time_seen: Optional[datetime] = None
    last_time_seen: Optional[datetime] = None


class AttendanceSyncItem(BaseModel):
    """A single attendance record pushed by the CVPC server."""

    branch_id: int
    employee_id: int
    date: Date
    first_time_seen: Optional[datetime] = None
    last_time_seen: Optional[datetime] = None
    disk_hours: Optional[float] = None
    total_hours: Optional[float] = None
    camera_id: Optional[str] = None


class AttendanceSyncPayload(BaseModel):
    records: list[AttendanceSyncItem]
