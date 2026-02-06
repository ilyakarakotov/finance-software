from sqlalchemy import Column, Integer, String, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base


class Phase(Base):
    __tablename__ = "phases"

    phase_id = Column(Integer, primary_key=True, autoincrement=True)
    project_id = Column(Integer, ForeignKey("projects.project_id", ondelete="CASCADE"), nullable=False)
    name = Column(String(100), nullable=False)
    start_month = Column(Integer, nullable=False, default=0)
    sequence = Column(Integer, nullable=False, default=1)

    project = relationship("Project", back_populates="phases")
    buildings = relationship("Building", back_populates="phase", cascade="all, delete-orphan")
