from sqlalchemy import Column, Integer, String, DECIMAL, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base


class CapitalStackTranche(Base):
    __tablename__ = "capital_stack_tranches"

    tranche_id = Column(Integer, primary_key=True, autoincrement=True)
    project_id = Column(Integer, ForeignKey("projects.project_id", ondelete="CASCADE"), nullable=False)
    type = Column(String(50), nullable=False)
    committed_amount = Column(DECIMAL(18, 2), default=0)
    interest_rate = Column(DECIMAL(10, 6), default=0)
    origination_fee_pct = Column(DECIMAL(10, 6), default=0)
    gp_equity_pct = Column(DECIMAL(10, 6), default=0)
    lp_equity_pct = Column(DECIMAL(10, 6), default=0)
    preferred_return_rate = Column(DECIMAL(10, 6), default=0)
    loan_release_pct = Column(DECIMAL(10, 6), default=0)

    project = relationship("Project", back_populates="capital_tranches")
