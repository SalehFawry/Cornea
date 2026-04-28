from sqlalchemy import Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from .base import Base


class Employee(Base):
    __tablename__ = "cornea_employees_table"

    employee_id: Mapped[int] = mapped_column(Integer, primary_key=True)
    branch_id: Mapped[int | None] = mapped_column(Integer)
    employee_name: Mapped[str | None] = mapped_column(String(255))
