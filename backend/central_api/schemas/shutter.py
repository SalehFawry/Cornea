from datetime import date as Date, datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, field_validator


# Width of CORNEA_SHUTTER_TABLE.CONFIDENCE / MODEL_VERSION (Oracle VARCHAR2(100)).
MODEL_METADATA_MAX_LEN = 100


class ShutterEventResponse(BaseModel):
    id: int  # synthetic row-number assigned by the service layer
    branch_id: int
    event_type: str
    timestamp: datetime
    date: Optional[Date] = None
    # Shutter-model telemetry; NULL on rows written before the columns existed.
    confidence: Optional[str] = None
    model_version: Optional[str] = None


class ShutterEventCreate(BaseModel):
    """CVPC may send optional ``date`` (ISO string); field name ``date`` uses ``Date`` type to avoid shadowing."""

    model_config = ConfigDict(extra="ignore")

    event_type: str
    event_time: datetime
    date: Optional[Date] = None
    # Edges send ``confidence`` as a JSON number, but Oracle stores VARCHAR2(100).
    # Both optional so older nodes omit them safely.
    confidence: Optional[str] = None
    model_version: Optional[str] = None

    @field_validator("confidence", "model_version", mode="before")
    @classmethod
    def _normalise_model_metadata(cls, v):
        """Accept a number or string; store text; blank → NULL.

        Pydantic would reject the float CVPC sends for ``confidence``, and Oracle
        would reject anything past the column width. Over-long values are
        truncated rather than 422'd: losing an audit field beats rejecting the
        shutter event itself.
        """
        if v is None:
            return None
        s = str(v).strip()
        if not s:
            return None
        return s[:MODEL_METADATA_MAX_LEN]


class ShutterStatusResponse(BaseModel):
    branch_id: int
    latest_event_type: Optional[str] = None
    latest_timestamp: Optional[datetime] = None
