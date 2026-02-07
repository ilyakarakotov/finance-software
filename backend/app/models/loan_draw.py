from sqlalchemy import Column, Integer, String, DECIMAL, ForeignKey, Date
from sqlalchemy.orm import relationship
from app.database import Base


class LoanDraw(Base):
    __tablename__ = "loan_draws"

    loan_draw_id = Column(Integer, primary_key=True, autoincrement=True)
    project_id = Column(Integer, ForeignKey("projects.project_id", ondelete="CASCADE"), nullable=False)
    building_id = Column(Integer, ForeignKey("buildings.building_id", ondelete="SET NULL"), nullable=True)
    loan_number = Column(String(50))
    inspection_date = Column(Date)
    draw_category = Column(String(50), nullable=False)
    description = Column(String(200), nullable=False)
    csi_code = Column(String(10))
    budget_amount = Column(DECIMAL(18, 2), default=0)
    drawn_at_closing = Column(DECIMAL(18, 2), default=0)
    sort_order = Column(Integer, default=0)

    project = relationship("Project", back_populates="loan_draws")
    building = relationship("Building", back_populates="loan_draws")
    periods = relationship("LoanDrawPeriod", back_populates="loan_draw", cascade="all, delete-orphan")


class LoanDrawPeriod(Base):
    __tablename__ = "loan_draw_periods"

    period_id = Column(Integer, primary_key=True, autoincrement=True)
    loan_draw_id = Column(Integer, ForeignKey("loan_draws.loan_draw_id", ondelete="CASCADE"), nullable=False)
    draw_number = Column(Integer, nullable=False)
    draw_date = Column(Date)
    amount = Column(DECIMAL(18, 2), default=0)

    loan_draw = relationship("LoanDraw", back_populates="periods")
