from pydantic import BaseModel
from typing import Optional, List, Dict


class CapitalStackTrancheCreate(BaseModel):
    project_id: int
    type: str
    committed_amount: float = 0.0
    interest_rate: float = 0.0
    origination_fee_pct: float = 0.0
    gp_equity_pct: float = 0.0
    lp_equity_pct: float = 0.0
    preferred_return_rate: float = 0.0
    loan_release_pct: float = 0.0


class CapitalStackTrancheUpdate(BaseModel):
    type: Optional[str] = None
    committed_amount: Optional[float] = None
    interest_rate: Optional[float] = None
    origination_fee_pct: Optional[float] = None
    gp_equity_pct: Optional[float] = None
    lp_equity_pct: Optional[float] = None
    preferred_return_rate: Optional[float] = None
    loan_release_pct: Optional[float] = None


class CapitalStackTrancheResponse(BaseModel):
    tranche_id: int
    project_id: int
    type: str
    committed_amount: float
    interest_rate: float
    origination_fee_pct: float
    gp_equity_pct: float
    lp_equity_pct: float
    preferred_return_rate: float
    loan_release_pct: float

    class Config:
        from_attributes = True


class PromoteTierCreate(BaseModel):
    project_id: int
    sequence: int = 0
    hurdle_rate: float = 0.0
    gp_split: float = 0.0
    lp_split: float = 0.0


class PromoteTierUpdate(BaseModel):
    sequence: Optional[int] = None
    hurdle_rate: Optional[float] = None
    gp_split: Optional[float] = None
    lp_split: Optional[float] = None


class PromoteTierResponse(BaseModel):
    tier_id: int
    project_id: int
    sequence: int
    hurdle_rate: float
    gp_split: float
    lp_split: float

    class Config:
        from_attributes = True
