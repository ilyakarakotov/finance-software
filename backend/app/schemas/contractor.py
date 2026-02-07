from pydantic import BaseModel, ConfigDict
from typing import Optional


class ContractorCreate(BaseModel):
    building_id: int
    name: str
    code: str
    scope_description: Optional[str] = None


class ContractorUpdate(BaseModel):
    name: Optional[str] = None
    code: Optional[str] = None
    scope_description: Optional[str] = None


class ContractorResponse(BaseModel):
    contractor_id: int
    building_id: int
    name: str
    code: str
    scope_description: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)
