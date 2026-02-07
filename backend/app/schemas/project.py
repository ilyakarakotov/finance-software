from pydantic import BaseModel, ConfigDict
from typing import Optional, List
from datetime import datetime


class PhaseCreate(BaseModel):
    name: str
    start_month: int = 0
    sequence: int = 1


class PhaseResponse(PhaseCreate):
    phase_id: int
    project_id: int
    buildings: List["BuildingResponse"] = []

    model_config = ConfigDict(from_attributes=True)


class BuildingCreate(BaseModel):
    phase_id: int
    name: str
    unit_count: int
    sf_per_unit: Optional[int] = None
    total_sf: Optional[int] = None
    construction_start_month: int = 1
    construction_duration: int = 6
    gross_sf: Optional[int] = None
    far_sf: Optional[int] = None
    garage_sf: Optional[int] = None
    crawl_space_sf: Optional[int] = None
    slab_on_grade_sf: Optional[int] = None
    price_range: Optional[float] = None
    project_type: Optional[str] = None
    owner: Optional[str] = None
    duration_weeks: Optional[int] = None


class BuildingUpdate(BaseModel):
    name: Optional[str] = None
    unit_count: Optional[int] = None
    sf_per_unit: Optional[int] = None
    total_sf: Optional[int] = None
    construction_start_month: Optional[int] = None
    construction_duration: Optional[int] = None
    gross_sf: Optional[int] = None
    far_sf: Optional[int] = None
    garage_sf: Optional[int] = None
    crawl_space_sf: Optional[int] = None
    slab_on_grade_sf: Optional[int] = None
    price_range: Optional[float] = None
    project_type: Optional[str] = None
    owner: Optional[str] = None
    duration_weeks: Optional[int] = None


class BuildingResponse(BuildingCreate):
    building_id: int
    units: List["UnitResponse"] = []

    model_config = ConfigDict(from_attributes=True)


class UnitCreate(BaseModel):
    building_id: int
    unit_number: str
    sf: Optional[int] = None
    sale_price: Optional[float] = None
    sale_month: Optional[int] = None
    status: str = "available"


class UnitUpdate(BaseModel):
    sf: Optional[int] = None
    sale_price: Optional[float] = None
    sale_month: Optional[int] = None
    price_per_sf: Optional[float] = None
    status: Optional[str] = None


class UnitResponse(BaseModel):
    unit_id: int
    building_id: int
    unit_number: str
    sf: Optional[int] = None
    sale_price: Optional[float] = None
    sale_month: Optional[int] = None
    price_per_sf: Optional[float] = None
    status: str

    model_config = ConfigDict(from_attributes=True)


class ProjectCreate(BaseModel):
    name: str
    address: Optional[str] = None
    lot_size_acres: Optional[float] = None
    start_date: Optional[datetime] = None
    total_units: Optional[int] = None
    total_sf: Optional[int] = None
    cost_of_sale_pct: float = 0.065
    gc_fee_pct: float = 0.12
    contingency_pct: float = 0.12
    soft_costs_pct: float = 0.12
    sales_tax_rate: float = 0.0
    construction_cost_psf: float = 0.0
    gp_equity_pct: float = 0.59
    preferred_return_rate: float = 0.18
    senior_debt_rate: float = 0.11
    loan_release_pct: float = 1.15
    land_loan_origination_pct: float = 0.03
    use_ltc_ratio: bool = False
    ltc_ratio: Optional[float] = None


class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    address: Optional[str] = None
    lot_size_acres: Optional[float] = None
    start_date: Optional[datetime] = None
    total_units: Optional[int] = None
    total_sf: Optional[int] = None
    cost_of_sale_pct: Optional[float] = None
    gc_fee_pct: Optional[float] = None
    contingency_pct: Optional[float] = None
    soft_costs_pct: Optional[float] = None
    sales_tax_rate: Optional[float] = None
    construction_cost_psf: Optional[float] = None
    gp_equity_pct: Optional[float] = None
    preferred_return_rate: Optional[float] = None
    senior_debt_rate: Optional[float] = None
    loan_release_pct: Optional[float] = None
    land_loan_origination_pct: Optional[float] = None
    use_ltc_ratio: Optional[bool] = None
    ltc_ratio: Optional[float] = None


class ProjectResponse(BaseModel):
    project_id: int
    name: str
    address: Optional[str] = None
    lot_size_acres: Optional[float] = None
    start_date: Optional[datetime] = None
    total_units: Optional[int] = None
    total_sf: Optional[int] = None
    cost_of_sale_pct: float
    gc_fee_pct: float
    contingency_pct: float
    soft_costs_pct: float = 0.12
    sales_tax_rate: float
    construction_cost_psf: float = 0.0
    gp_equity_pct: float = 0.59
    preferred_return_rate: float = 0.18
    senior_debt_rate: float = 0.11
    loan_release_pct: float = 1.15
    land_loan_origination_pct: float = 0.03
    use_ltc_ratio: bool = False
    ltc_ratio: Optional[float] = None

    model_config = ConfigDict(from_attributes=True)


class ProjectDetailResponse(ProjectResponse):
    phases: List[PhaseResponse] = []

    model_config = ConfigDict(from_attributes=True)


# Forward reference updates
PhaseResponse.model_rebuild()
BuildingResponse.model_rebuild()
