from sqlalchemy import Column, Integer, String, DECIMAL, ForeignKey, Boolean
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

    project = relationship("Project", back_populates="budget_line_items")
    building = relationship("Building", back_populates="budget_line_items")
