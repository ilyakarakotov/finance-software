from sqlalchemy import Column, Integer, String, DECIMAL
from sqlalchemy.orm import relationship
from app.database import Base


class CostCode(Base):
    __tablename__ = "cost_codes"

    cost_code_id = Column(Integer, primary_key=True, autoincrement=True)
    division_number = Column(String(10), nullable=False)
    division_name = Column(String(100), nullable=False)
    category_number = Column(String(10), nullable=False)
    category_name = Column(String(100), nullable=False)
    subcategory_number = Column(String(10), nullable=False)
    subcategory_name = Column(String(100), nullable=False)
    item_code = Column(String(10), nullable=False, unique=True)
    item_name = Column(String(200), nullable=False)
    income_account_number = Column(String(20))
    income_account_name = Column(String(100))
    expense_account_number = Column(String(20))
    expense_account_name = Column(String(100))
    default_unit_type = Column(String(20))
    default_unit_price = Column(DECIMAL(18, 2))

    budget_line_items = relationship("BudgetLineItem", back_populates="cost_code")
