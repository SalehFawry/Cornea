from sqlalchemy import Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from .base import Base


class ShutterWorkingTime(Base):
    __tablename__ = "cornea_shutter_working_time_table"

    branch_id: Mapped[int] = mapped_column(Integer, primary_key=True)
    weekday: Mapped[str] = mapped_column(String(10), primary_key=True)
    shift_order: Mapped[int] = mapped_column(Integer, primary_key=True)
    shutter_opening_time: Mapped[str | None] = mapped_column(String(8))
    shutter_partial_time: Mapped[str | None] = mapped_column(String(8))
    shutter_closing_time: Mapped[str | None] = mapped_column(String(8))
