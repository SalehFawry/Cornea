from sqlalchemy import Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from .base import Base


class AlertReceiver(Base):
    __tablename__ = "cornea_alert_receiver_table"

    hr_id: Mapped[int] = mapped_column(Integer, primary_key=True)
    title: Mapped[str | None] = mapped_column(String(255))
    email: Mapped[str | None] = mapped_column(String(255))
    phone_number: Mapped[str | None] = mapped_column(String(20))
    severity_threshold: Mapped[int | None] = mapped_column(Integer)
