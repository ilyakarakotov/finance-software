from sqlalchemy import Column, Integer, String, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base


class Building(Base):
    __tablename__ = "buildings"

    building_id = Column(Integer, primary_key=True, autoincrement=True)
    phase_id = Column(Integer, ForeignKey("phases.phase_id", ondelete="CASCADE"), nullable=False)
    name = Column(String(100), nullable=False)
    unit_count = Column(Integer, nullable=False)
    sf_per_unit = Column(Integer)
    total_sf = Column(Integer)
    construction_start_month = Column(Integer, default=1)
    construction_duration = Column(Integer, default=6)

    phase = relationship("Phase", back_populates="buildings")
    units = relationship("Unit", back_populates="building", cascade="all, delete-orphan")
    budget_line_items = relationship("BudgetLineItem", back_populates="building")
