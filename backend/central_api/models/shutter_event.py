from datetime import date, datetime

from sqlalchemy import Date, Float, Integer, String, TIMESTAMP
from sqlalchemy.orm import Mapped, mapped_column

from .base import Base


class ShutterEvent(Base):
    __tablename__ = "cornea_shutter_table"

    branch_id: Mapped[int] = mapped_column(Integer, primary_key=True)
    event_type: Mapped[str] = mapped_column(String(255), primary_key=True)
    event_time: Mapped[datetime] = mapped_column(TIMESTAMP, primary_key=True)
    date: Mapped[date | None] = mapped_column(Date)
    confidence: Mapped[float | None] = mapped_column(Float, nullable=True)
    model_version: Mapped[str | None] = mapped_column(String(255), nullable=True)
