from datetime import date, datetime

from sqlalchemy import Date, Float, Integer, String, TIMESTAMP
from sqlalchemy.orm import Mapped, mapped_column

from .base import Base


class Customer(Base):
    """Oracle table `cornea_customer_table`."""

    __tablename__ = "cornea_customer_table"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    branch_id: Mapped[int | None] = mapped_column(Integer, index=True)
    customer_id: Mapped[str | None] = mapped_column(String(36), index=True)
    date: Mapped[date | None] = mapped_column(Date, index=True)
    first_time_seen: Mapped[datetime | None] = mapped_column(TIMESTAMP)
    last_time_seen: Mapped[datetime | None] = mapped_column(TIMESTAMP)
    service_time: Mapped[float | None] = mapped_column(Float)
    waiting_time: Mapped[float | None] = mapped_column(Float)
    camera_id: Mapped[str | None] = mapped_column(String(255))
