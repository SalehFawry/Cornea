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
    # Oracle VARCHAR2(100): keep the probability string as the edge formatted it
    # (no float rounding). NULL for rows written before the columns existed.
    confidence: Mapped[str | None] = mapped_column(String(100), nullable=True)
    # Oracle VARCHAR2(100): weights filename the edge was running.
    model_version: Mapped[str | None] = mapped_column(String(100), nullable=True)
