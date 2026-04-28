from datetime import date as Date, datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict


class AlertResponse(BaseModel):
    # alert_id (UUID string) is exposed as `id` for the frontend
    id: str
    branch_id: Optional[int] = None
    alert_type: Optional[str] = None
    timestamp: Optional[datetime] = None
    date: Optional[Date] = None
    # Populated via JOIN with alert_info_table
    message: Optional[str] = None


class AlertCreate(BaseModel):
    model_config = ConfigDict(extra="ignore")

    alert_id: str  # UUID provided by the CVPC server
    branch_id: int
    alert_type: str
    timestamp: datetime
    date: Optional[Date] = None


class AlertInfoResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    alert_type: str
    description: Optional[str] = None


class AlertInfoCreate(BaseModel):
    alert_type: str
    description: Optional[str] = None
    severity: Optional[int] = None
