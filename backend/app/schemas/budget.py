from pydantic import BaseModel
from typing import Optional, List


class BudgetLineItemCreate(BaseModel):
    project_id: int
    building_id: Optional[int] = None
    category: str
    subcategory: Optional[str] = None
    csi_code: Optional[str] = None
    description: Optional[str] = None
    budget_amount: float = 0.0
    forecast_method: str = "s_curve"
    start_month: int = 0
    duration_months: int = 12
    s_curve_steepness: int = 5
    is_auto_generated: bool = False


class BudgetLineItemUpdate(BaseModel):
    building_id: Optional[int] = None
    category: Optional[str] = None
    subcategory: Optional[str] = None
    csi_code: Optional[str] = None
    description: Optional[str] = None
    budget_amount: Optional[float] = None
    forecast_method: Optional[str] = None
    start_month: Optional[int] = None
    duration_months: Optional[int] = None
    s_curve_steepness: Optional[int] = None


class BudgetLineItemResponse(BaseModel):
    line_item_id: int
    project_id: int
    building_id: Optional[int] = None
    category: str
    subcategory: Optional[str] = None
    csi_code: Optional[str] = None
    description: Optional[str] = None
    budget_amount: float
    forecast_method: str
    start_month: int
    duration_months: int
    s_curve_steepness: int
    is_auto_generated: bool = False

    class Config:
        from_attributes = True


class SCurvePreviewRequest(BaseModel):
    total_amount: float
    duration_months: int
    steepness: int = 5


class SCurvePreviewResponse(BaseModel):
    monthly_amounts: List[float]
