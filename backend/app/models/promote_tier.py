from sqlalchemy import Column, Integer, DECIMAL, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base


class PromoteTier(Base):
    __tablename__ = "promote_tiers"

    tier_id = Column(Integer, primary_key=True, autoincrement=True)
    project_id = Column(Integer, ForeignKey("projects.project_id", ondelete="CASCADE"), nullable=False)
    sequence = Column(Integer, nullable=False, default=0)
    hurdle_rate = Column(DECIMAL(10, 6), default=0)
    gp_split = Column(DECIMAL(10, 6), default=0)
    lp_split = Column(DECIMAL(10, 6), default=0)

    project = relationship("Project", back_populates="promote_tiers")
