from sqlalchemy import Column, Integer, String, DECIMAL, ForeignKey, Text
from sqlalchemy.orm import relationship
from app.database import Base


class BuildersCapitalMapping(Base):
    __tablename__ = "builders_capital_mappings"

    mapping_id = Column(Integer, primary_key=True, autoincrement=True)
    project_id = Column(Integer, ForeignKey("projects.project_id", ondelete="CASCADE"), nullable=False)
    building_id = Column(Integer, ForeignKey("buildings.building_id", ondelete="SET NULL"), nullable=True)
    bc_category = Column(String(100), nullable=False)
    csi_code = Column(String(10))
    description = Column(String(200))
    amount = Column(DECIMAL(18, 2), default=0)
    tax_rate = Column(DECIMAL(10, 6), default=0)
    amount_with_tax = Column(DECIMAL(18, 2), default=0)
    comments = Column(Text)
    adjustment = Column(DECIMAL(18, 2), default=0)
    final_amount = Column(DECIMAL(18, 2), default=0)
    sort_order = Column(Integer, default=0)

    project = relationship("Project", back_populates="builders_capital_mappings")
    building = relationship("Building", back_populates="builders_capital_mappings")
