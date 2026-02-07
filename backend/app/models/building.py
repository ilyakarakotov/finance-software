from sqlalchemy import Column, Integer, String, ForeignKey, DECIMAL
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
    gross_sf = Column(Integer)
    far_sf = Column(Integer)
    garage_sf = Column(Integer)
    crawl_space_sf = Column(Integer)
    slab_on_grade_sf = Column(Integer)
    price_range = Column(DECIMAL(12, 2))
    project_type = Column(String(20))
    owner = Column(String(100))
    duration_weeks = Column(Integer)

    phase = relationship("Phase", back_populates="buildings")
    units = relationship("Unit", back_populates="building", cascade="all, delete-orphan")
    budget_line_items = relationship("BudgetLineItem", back_populates="building")
    contractors = relationship("Contractor", back_populates="building", cascade="all, delete-orphan")
    loan_draws = relationship("LoanDraw", back_populates="building")
    builders_capital_mappings = relationship("BuildersCapitalMapping", back_populates="building")
