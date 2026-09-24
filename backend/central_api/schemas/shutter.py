from datetime import date as Date, datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, field_validator


"""Width of ``CORNEA_SHUTTER_TABLE.CONFIDENCE`` / ``MODEL_VERSION``."""
MODEL_METADATA_MAX_LEN = 100


class ShutterEventResponse(BaseModel):
    id: int  # synthetic row-number assigned by the service layer
    branch_id: int
    event_type: str
    timestamp: datetime
    date: Optional[Date] = None
    # Shutter-model telemetry; NULL on rows written before the columns existed
    # and on synthetic opens that no model produced.
    confidence: Optional[str] = None
    model_version: Optional[str] = None


class ShutterEventCreate(BaseModel):
    """CVPC may send optional ``date`` (ISO string); field name ``date`` uses ``Date`` type to avoid shadowing."""

    model_config = ConfigDict(extra="ignore")

    event_type: str
    event_time: datetime
    date: Optional[Date] = None
    # Shutter-model telemetry. CVPC sends ``confidence`` as a JSON number, but
    # the Oracle column is VARCHAR2(100), so it is stored as text exactly as the
    # node formatted it. Both are optional: older nodes omit them.
    confidence: Optional[str] = None
    model_version: Optional[str] = None

    @field_validator("confidence", "model_version", mode="before")
    @classmethod
    def _normalise_model_metadata(cls, v):
        """Accept a number or string; store text, blank → NULL.

        Pydantic would reject the float CVPC actually sends for ``confidence``,
        and Oracle would reject anything past the column width. Over-long values
        are truncated rather than 422'd: losing an audit field is preferable to
        rejecting the shutter event itself.
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
