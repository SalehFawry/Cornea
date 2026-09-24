from datetime import date, datetime

from sqlalchemy import Date, Integer, String, TIMESTAMP
from sqlalchemy.orm import Mapped, mapped_column

from .base import Base


class ShutterEvent(Base):
    __tablename__ = "cornea_shutter_table"

    branch_id: Mapped[int] = mapped_column(Integer, primary_key=True)
    event_type: Mapped[str] = mapped_column(String(255), primary_key=True)
    event_time: Mapped[datetime] = mapped_column(TIMESTAMP, primary_key=True)
    date: Mapped[date | None] = mapped_column(Date)
    # Shutter-model telemetry sent by CVPC with each sensor event. Both are
    # Oracle VARCHAR2(100): ``confidence`` keeps the probability as the node
    # formatted it (no float rounding), ``model_version`` is the weights file
    # the node was running. NULL for rows written before the columns existed
    # and for synthetic opens that no model produced.
    confidence: Mapped[str | None] = mapped_column(String(100))
    model_version: Mapped[str | None] = mapped_column(String(100))
