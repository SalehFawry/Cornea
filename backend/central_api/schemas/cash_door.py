from datetime import date as Date, datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict


class CashDoorEventResponse(BaseModel):
    id: int  # synthetic row-number assigned by the service layer
    branch_id: int
    event_type: str
    timestamp: datetime
    date: Optional[Date] = None


class CashDoorEventCreate(BaseModel):
    model_config = ConfigDict(extra="ignore")

    event_type: str
    event_time: datetime
    date: Optional[Date] = None


class CashDoorStatusResponse(BaseModel):
    branch_id: int
    latest_event_type: Optional[str] = None
    latest_timestamp: Optional[datetime] = None
