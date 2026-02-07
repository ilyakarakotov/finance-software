from sqlalchemy import Column, Integer, String, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base


class Contractor(Base):
    __tablename__ = "contractors"

    contractor_id = Column(Integer, primary_key=True, autoincrement=True)
    building_id = Column(Integer, ForeignKey("buildings.building_id", ondelete="CASCADE"), nullable=False)
    name = Column(String(100), nullable=False)
    code = Column(String(10), nullable=False)
    scope_description = Column(String(500))

    building = relationship("Building", back_populates="contractors")
    budget_line_items = relationship("BudgetLineItem", back_populates="contractor")
