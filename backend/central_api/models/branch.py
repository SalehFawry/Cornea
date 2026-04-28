from sqlalchemy import Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from .base import Base


class Branch(Base):
    __tablename__ = "cornea_branch_table"

    branch_id: Mapped[int] = mapped_column(Integer, primary_key=True)
    branch_name: Mapped[str | None] = mapped_column(String(255))
    region: Mapped[str | None] = mapped_column(String(255))
    area: Mapped[str | None] = mapped_column(String(255))
