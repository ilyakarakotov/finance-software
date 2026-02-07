from pydantic import BaseModel, ConfigDict
from typing import Optional


class BCMappingCreate(BaseModel):
    project_id: int
    building_id: Optional[int] = None
    bc_category: str
    csi_code: Optional[str] = None
    description: Optional[str] = None
    amount: float = 0.0
    tax_rate: float = 0.0
    amount_with_tax: float = 0.0
    comments: Optional[str] = None
    adjustment: float = 0.0
    final_amount: float = 0.0
    sort_order: int = 0


class BCMappingUpdate(BaseModel):
    building_id: Optional[int] = None
    bc_category: Optional[str] = None
    csi_code: Optional[str] = None
    description: Optional[str] = None
    amount: Optional[float] = None
    tax_rate: Optional[float] = None
    amount_with_tax: Optional[float] = None
    comments: Optional[str] = None
    adjustment: Optional[float] = None
    final_amount: Optional[float] = None
    sort_order: Optional[int] = None


class BCMappingResponse(BaseModel):
    mapping_id: int
    project_id: int
    building_id: Optional[int] = None
    bc_category: str
    csi_code: Optional[str] = None
    description: Optional[str] = None
    amount: float
    tax_rate: float
    amount_with_tax: float
    comments: Optional[str] = None
    adjustment: float
    final_amount: float
    sort_order: int

    model_config = ConfigDict(from_attributes=True)


class BCSummary(BaseModel):
    total_amount: float
    total_tax: float
    total_with_tax: float
    total_adjustments: float
    total_final_amount: float
    mapping_count: int

    model_config = ConfigDict(from_attributes=True)
