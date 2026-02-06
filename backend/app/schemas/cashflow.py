from pydantic import BaseModel
from typing import Optional, List, Dict
from datetime import datetime


class MonthlyCashflowResponse(BaseModel):
    cf_id: Optional[int] = None
    project_id: int
    month_number: int
    calendar_date: Optional[datetime] = None
    construction_cost: float = 0.0
    contingency: float = 0.0
    horizontal: float = 0.0
    soft_costs: float = 0.0
    gc_fee: float = 0.0
    land: float = 0.0
    other: float = 0.0
    total_development_cost: float = 0.0
    cumulative_development_cost: float = 0.0
    equity_draw: float = 0.0
    senior_draw: float = 0.0
    senior_balance: float = 0.0
    senior_interest: float = 0.0
    mezz_draw: float = 0.0
    mezz_balance: float = 0.0
    mezz_interest: float = 0.0
    land_loan_draw: float = 0.0
    land_loan_balance: float = 0.0
    gross_sales: float = 0.0
    cost_of_sale: float = 0.0
    net_sales: float = 0.0
    loan_payoff_from_sales: float = 0.0
    free_cashflow: float = 0.0
    cumulative_cashflow: float = 0.0

    class Config:
        from_attributes = True


class WaterfallTierDetail(BaseModel):
    sequence: int
    gp_amount: float
    lp_amount: float


class WaterfallResponse(BaseModel):
    gp_return_of_capital: float = 0.0
    lp_return_of_capital: float = 0.0
    gp_preferred_return: float = 0.0
    lp_preferred_return: float = 0.0
    gp_promote_by_tier: Dict[str, float] = {}
    lp_promote_by_tier: Dict[str, float] = {}
    total_gp: float = 0.0
    total_lp: float = 0.0
    gp_multiple: float = 0.0
    lp_multiple: float = 0.0


class ProjectMetricsResponse(BaseModel):
    total_development_cost: float = 0.0
    total_with_financing: float = 0.0
    total_revenue: float = 0.0
    total_cost_of_sale: float = 0.0
    senior_debt_committed: float = 0.0
    total_equity: float = 0.0
    gp_equity: float = 0.0
    lp_equity: float = 0.0
    senior_interest: float = 0.0
    project_profit: float = 0.0
    profit_margin: float = 0.0
    levered_xirr: Optional[float] = None
    unlevered_xirr: Optional[float] = None
    equity_multiple: Optional[float] = None
    gp_xirr: Optional[float] = None
    lp_xirr: Optional[float] = None
    gp_multiple: Optional[float] = None
    lp_multiple: Optional[float] = None
    ltc_ratio: Optional[float] = None
    peak_equity: float = 0.0
    peak_debt_balance: float = 0.0
    total_financing_cost: float = 0.0
    waterfall: Optional[WaterfallResponse] = None


class RecalcResponse(BaseModel):
    cashflows: List[MonthlyCashflowResponse]
    metrics: ProjectMetricsResponse


class SensitivityCell(BaseModel):
    sale_price_psf: float
    construction_cost_psf: float
    project_profit: float
    xirr: Optional[float] = None


class SensitivityGridResponse(BaseModel):
    sale_price_psf_values: List[float]
    construction_cost_psf_values: List[float]
    cells: List[List[SensitivityCell]]


class PriceSolverRequest(BaseModel):
    target_metric: str  # "profit_margin", "equity_multiple", or "levered_irr"
    target_value: float
    distribution_mode: str = "uniform"  # "uniform" or "proportional"


class BuildingPriceSuggestion(BaseModel):
    building_id: int
    building_name: str
    suggested_psf: float
    unit_count: int
    total_sf: int


class PriceSolverResponse(BaseModel):
    required_avg_psf: float
    break_even_psf: float
    target_revenue: float
    building_suggestions: List[BuildingPriceSuggestion]


class PricingAnalysisResponse(BaseModel):
    break_even_psf: float = 0.0
    current_avg_psf: float = 0.0
    margin_above_break_even: float = 0.0
    psf_for_20pct_margin: float = 0.0
    psf_for_3x_multiple: float = 0.0
