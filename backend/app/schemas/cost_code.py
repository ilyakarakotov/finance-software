from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List


class CostCodeCreate(BaseModel):
    division_number: str
    division_name: str
    category_number: str
    category_name: str
    subcategory_number: str
    subcategory_name: str
    item_code: str
    item_name: str
    income_account_number: Optional[str] = None
    income_account_name: Optional[str] = None
    expense_account_number: Optional[str] = None
    expense_account_name: Optional[str] = None
    default_unit_type: Optional[str] = None
    default_unit_price: Optional[float] = None


class CostCodeUpdate(BaseModel):
    division_number: Optional[str] = None
    division_name: Optional[str] = None
    category_number: Optional[str] = None
    category_name: Optional[str] = None
    subcategory_number: Optional[str] = None
    subcategory_name: Optional[str] = None
    item_code: Optional[str] = None
    item_name: Optional[str] = None
    income_account_number: Optional[str] = None
    income_account_name: Optional[str] = None
    expense_account_number: Optional[str] = None
    expense_account_name: Optional[str] = None
    default_unit_type: Optional[str] = None
    default_unit_price: Optional[float] = None


class CostCodeResponse(BaseModel):
    cost_code_id: int
    division_number: str
    division_name: str
    category_number: str
    category_name: str
    subcategory_number: str
    subcategory_name: str
    item_code: str
    item_name: str
    income_account_number: Optional[str] = None
    income_account_name: Optional[str] = None
    expense_account_number: Optional[str] = None
    expense_account_name: Optional[str] = None
    default_unit_type: Optional[str] = None
    default_unit_price: Optional[float] = None

    model_config = ConfigDict(from_attributes=True)


class CostCodeTree(BaseModel):
    cost_code_id: int
    division_number: str
    division_name: str
    category_number: str
    category_name: str
    subcategory_number: str
    subcategory_name: str
    item_code: str
    item_name: str
    income_account_number: Optional[str] = None
    income_account_name: Optional[str] = None
    expense_account_number: Optional[str] = None
    expense_account_name: Optional[str] = None
    default_unit_type: Optional[str] = None
    default_unit_price: Optional[float] = None

    model_config = ConfigDict(from_attributes=True)
