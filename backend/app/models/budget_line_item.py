from sqlalchemy import Column, Integer, String, DECIMAL, ForeignKey, Boolean, Text
from sqlalchemy.orm import relationship
from app.database import Base


class BudgetLineItem(Base):
    __tablename__ = "budget_line_items"

    line_item_id = Column(Integer, primary_key=True, autoincrement=True)
    project_id = Column(Integer, ForeignKey("projects.project_id", ondelete="CASCADE"), nullable=False)
    building_id = Column(Integer, ForeignKey("buildings.building_id", ondelete="SET NULL"), nullable=True)
    category = Column(String(100), nullable=False)
    subcategory = Column(String(200))
    csi_code = Column(String(50), nullable=True)
    description = Column(String(500))
    budget_amount = Column(DECIMAL(18, 2), nullable=False, default=0)
    forecast_method = Column(String(50), default="s_curve")
    start_month = Column(Integer, default=0)
    duration_months = Column(Integer, default=12)
    s_curve_steepness = Column(Integer, default=5)
    is_auto_generated = Column(Boolean, default=False)
    cost_code_id = Column(Integer, ForeignKey("cost_codes.cost_code_id", ondelete="SET NULL"), nullable=True)
    division_code = Column(String(10))
    contractor_id = Column(Integer, ForeignKey("contractors.contractor_id", ondelete="SET NULL"), nullable=True)
    unit_type = Column(String(20))
    quantity = Column(DECIMAL(18, 4), default=0)
    unit_price = Column(DECIMAL(18, 4), default=0)
    standard_cost = Column(DECIMAL(18, 2), default=0)
    ps_unit_type = Column(String(20))
    ps_quantity = Column(DECIMAL(18, 4), default=0)
    ps_unit_price = Column(DECIMAL(18, 4), default=0)
    project_specific_cost = Column(DECIMAL(18, 2), default=0)
    parent_line_item_id = Column(Integer, ForeignKey("budget_line_items.line_item_id", ondelete="SET NULL"), nullable=True)
    hierarchy_level = Column(Integer, default=3)
    sort_order = Column(Integer, default=0)
    is_summary_row = Column(Boolean, default=False)
    sf_cost = Column(DECIMAL(18, 4))
    benchmark_pct = Column(DECIMAL(10, 4))
    notes = Column(Text)

    project = relationship("Project", back_populates="budget_line_items")
    building = relationship("Building", back_populates="budget_line_items")
    cost_code = relationship("CostCode", back_populates="budget_line_items")
    contractor = relationship("Contractor", back_populates="budget_line_items")
    parent = relationship("BudgetLineItem", remote_side=[line_item_id], back_populates="children")
    children = relationship("BudgetLineItem", back_populates="parent", cascade="all, delete-orphan")
