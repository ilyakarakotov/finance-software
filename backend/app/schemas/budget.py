from pydantic import BaseModel, ConfigDict
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
    cost_code_id: Optional[int] = None
    division_code: Optional[str] = None
    contractor_id: Optional[int] = None
    unit_type: Optional[str] = None
    quantity: Optional[float] = None
    unit_price: Optional[float] = None
    standard_cost: Optional[float] = None
    ps_unit_type: Optional[str] = None
    ps_quantity: Optional[float] = None
    ps_unit_price: Optional[float] = None
    project_specific_cost: Optional[float] = None
    parent_line_item_id: Optional[int] = None
    hierarchy_level: Optional[int] = None
    sort_order: Optional[int] = None
    is_summary_row: Optional[bool] = None
    sf_cost: Optional[float] = None
    benchmark_pct: Optional[float] = None
    notes: Optional[str] = None


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
    cost_code_id: Optional[int] = None
    division_code: Optional[str] = None
    contractor_id: Optional[int] = None
    unit_type: Optional[str] = None
    quantity: Optional[float] = None
    unit_price: Optional[float] = None
    standard_cost: Optional[float] = None
    ps_unit_type: Optional[str] = None
    ps_quantity: Optional[float] = None
    ps_unit_price: Optional[float] = None
    project_specific_cost: Optional[float] = None
    parent_line_item_id: Optional[int] = None
    hierarchy_level: Optional[int] = None
    sort_order: Optional[int] = None
    is_summary_row: Optional[bool] = None
    sf_cost: Optional[float] = None
    benchmark_pct: Optional[float] = None
    notes: Optional[str] = None


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
    cost_code_id: Optional[int] = None
    division_code: Optional[str] = None
    contractor_id: Optional[int] = None
    unit_type: Optional[str] = None
    quantity: Optional[float] = None
    unit_price: Optional[float] = None
    standard_cost: Optional[float] = None
    ps_unit_type: Optional[str] = None
    ps_quantity: Optional[float] = None
    ps_unit_price: Optional[float] = None
    project_specific_cost: Optional[float] = None
    parent_line_item_id: Optional[int] = None
    hierarchy_level: Optional[int] = None
    sort_order: Optional[int] = None
    is_summary_row: Optional[bool] = None
    sf_cost: Optional[float] = None
    benchmark_pct: Optional[float] = None
    notes: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class BudgetTreeNode(BaseModel):
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
    cost_code_id: Optional[int] = None
    division_code: Optional[str] = None
    contractor_id: Optional[int] = None
    unit_type: Optional[str] = None
    quantity: Optional[float] = None
    unit_price: Optional[float] = None
    standard_cost: Optional[float] = None
    ps_unit_type: Optional[str] = None
    ps_quantity: Optional[float] = None
    ps_unit_price: Optional[float] = None
    project_specific_cost: Optional[float] = None
    parent_line_item_id: Optional[int] = None
    hierarchy_level: Optional[int] = None
    sort_order: Optional[int] = None
    is_summary_row: Optional[bool] = None
    sf_cost: Optional[float] = None
    benchmark_pct: Optional[float] = None
    notes: Optional[str] = None
    children: List["BudgetTreeNode"] = []

    model_config = ConfigDict(from_attributes=True)


class BudgetTotals(BaseModel):
    total_budget_amount: float
    total_standard_cost: float
    total_project_specific_cost: float
    line_item_count: int

    model_config = ConfigDict(from_attributes=True)


class BudgetSFAnalysis(BaseModel):
    total_sf: Optional[int] = None
    total_sf_cost: float
    cost_per_sf: Optional[float] = None

    model_config = ConfigDict(from_attributes=True)


class SCurvePreviewRequest(BaseModel):
    total_amount: float
    duration_months: int
    steepness: int = 5


class SCurvePreviewResponse(BaseModel):
    monthly_amounts: List[float]


# Update forward references
BudgetTreeNode.model_rebuild()
