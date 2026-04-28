from sqlalchemy import Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from .base import Base


class AlertInfo(Base):
    __tablename__ = "cornea_alert_info_table"

    alert_type: Mapped[str] = mapped_column(String(255), primary_key=True)
    description: Mapped[str | None] = mapped_column(String(255))
    severity: Mapped[int | None] = mapped_column(Integer)
