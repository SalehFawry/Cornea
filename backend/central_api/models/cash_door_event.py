from datetime import date, datetime

from sqlalchemy import Date, Integer, String, TIMESTAMP
from sqlalchemy.orm import Mapped, mapped_column

from .base import Base


class CashDoorEvent(Base):
    __tablename__ = "cornea_cash_door_table"

    branch_id: Mapped[int] = mapped_column(Integer, primary_key=True)
    event_type: Mapped[str] = mapped_column(String(255), primary_key=True)
    event_time: Mapped[datetime] = mapped_column(TIMESTAMP, primary_key=True)
    date: Mapped[date | None] = mapped_column(Date)
