from pydantic import BaseModel, ConfigDict
from typing import Optional, List
from datetime import date


class LoanDrawPeriodCreate(BaseModel):
    draw_number: int
    draw_date: Optional[date] = None
    amount: float = 0.0


class LoanDrawPeriodUpdate(BaseModel):
    draw_number: Optional[int] = None
    draw_date: Optional[date] = None
    amount: Optional[float] = None


class LoanDrawPeriodResponse(BaseModel):
    period_id: int
    loan_draw_id: int
    draw_number: int
    draw_date: Optional[date] = None
    amount: float

    model_config = ConfigDict(from_attributes=True)


class LoanDrawCreate(BaseModel):
    project_id: int
    building_id: Optional[int] = None
    loan_number: Optional[str] = None
    inspection_date: Optional[date] = None
    draw_category: str
    description: str
    csi_code: Optional[str] = None
    budget_amount: float = 0.0
    drawn_at_closing: float = 0.0
    sort_order: int = 0


class LoanDrawUpdate(BaseModel):
    building_id: Optional[int] = None
    loan_number: Optional[str] = None
    inspection_date: Optional[date] = None
    draw_category: Optional[str] = None
    description: Optional[str] = None
    csi_code: Optional[str] = None
    budget_amount: Optional[float] = None
    drawn_at_closing: Optional[float] = None
    sort_order: Optional[int] = None


class LoanDrawResponse(BaseModel):
    loan_draw_id: int
    project_id: int
    building_id: Optional[int] = None
    loan_number: Optional[str] = None
    inspection_date: Optional[date] = None
    draw_category: str
    description: str
    csi_code: Optional[str] = None
    budget_amount: float
    drawn_at_closing: float
    sort_order: int
    draw_budget: Optional[float] = None

    model_config = ConfigDict(from_attributes=True)


class LoanDrawSchedule(BaseModel):
    loan_draw_id: int
    project_id: int
    building_id: Optional[int] = None
    loan_number: Optional[str] = None
    inspection_date: Optional[date] = None
    draw_category: str
    description: str
    csi_code: Optional[str] = None
    budget_amount: float
    drawn_at_closing: float
    sort_order: int
    periods: List[LoanDrawPeriodResponse] = []

    model_config = ConfigDict(from_attributes=True)
