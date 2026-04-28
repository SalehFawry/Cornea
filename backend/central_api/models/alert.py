from datetime import date, datetime

from sqlalchemy import Date, DateTime, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from .base import Base


class Alert(Base):
    """Maps to CORNEA_ALERT_TABLE; ``timestamp`` and ``date`` are case-sensitive lowercase in Oracle."""

    __tablename__ = "cornea_alert_table"

    alert_id: Mapped[str] = mapped_column(String(36), primary_key=True)
    branch_id: Mapped[int | None] = mapped_column(Integer, index=True)
    timestamp: Mapped[datetime | None] = mapped_column(
        "timestamp",
        DateTime(),
        quote=True,
    )
    alert_type: Mapped[str | None] = mapped_column(String(255))
    date: Mapped[date | None] = mapped_column(
        "date",
        Date(),
        quote=True,
    )
