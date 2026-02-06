from sqlalchemy import Column, Integer, String, DECIMAL, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base


class Unit(Base):
    __tablename__ = "units"

    unit_id = Column(Integer, primary_key=True, autoincrement=True)
    building_id = Column(Integer, ForeignKey("buildings.building_id", ondelete="CASCADE"), nullable=False)
    unit_number = Column(String(50), nullable=False)
    sf = Column(Integer)
    sale_price = Column(DECIMAL(18, 2))
    sale_month = Column(Integer, nullable=True)
    price_per_sf = Column(DECIMAL(10, 2), nullable=True)
    status = Column(String(50), default="available")

    building = relationship("Building", back_populates="units")
