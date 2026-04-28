from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


class BranchResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    branch_id: int
    branch_name: Optional[str] = None
    region: Optional[str] = None
    area: Optional[str] = None
    # Not stored in the DB yet; returned as None until the column is added.
    governorate: Optional[str] = None


class BranchCreate(BaseModel):
    branch_id: int
    branch_name: Optional[str] = None
    region: Optional[str] = None
    area: Optional[str] = None


class EmployeeResponse(BaseModel):
    """Maps DB `employee_name` → API `name`."""

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

    employee_id: int
    branch_id: Optional[int] = None
    name: Optional[str] = Field(None, validation_alias="employee_name")


class EmployeeCreate(BaseModel):
    employee_id: int
    branch_id: int
    employee_name: Optional[str] = None


class ShutterScheduleResponse(BaseModel):
    branch_id: int
    day: str  # ISO date string requested by the caller
    opening_time: Optional[str] = None
    partial_time: Optional[str] = None
    closing_time: Optional[str] = None


class ShutterScheduleCreate(BaseModel):
    branch_id: int
    weekday: str
    shift_order: int = 1
    shutter_opening_time: Optional[str] = None
    shutter_partial_time: Optional[str] = None
    shutter_closing_time: Optional[str] = None
