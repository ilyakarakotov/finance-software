from sqlalchemy import Column, Integer, DECIMAL, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base


class MonthlyCashflow(Base):
    __tablename__ = "monthly_cashflows"

    cf_id = Column(Integer, primary_key=True, autoincrement=True)
    project_id = Column(Integer, ForeignKey("projects.project_id", ondelete="CASCADE"), nullable=False)
    month_number = Column(Integer, nullable=False)
    calendar_date = Column(DateTime)

    # Costs
    construction_cost = Column(DECIMAL(18, 2), default=0)
    contingency = Column(DECIMAL(18, 2), default=0)
    horizontal = Column(DECIMAL(18, 2), default=0)
    soft_costs = Column(DECIMAL(18, 2), default=0)
    gc_fee = Column(DECIMAL(18, 2), default=0)
    land = Column(DECIMAL(18, 2), default=0)
    other = Column(DECIMAL(18, 2), default=0)
    total_development_cost = Column(DECIMAL(18, 2), default=0)
    cumulative_development_cost = Column(DECIMAL(18, 2), default=0)

    # Financing
    equity_draw = Column(DECIMAL(18, 2), default=0)
    senior_draw = Column(DECIMAL(18, 2), default=0)
    senior_balance = Column(DECIMAL(18, 2), default=0)
    senior_interest = Column(DECIMAL(18, 2), default=0)
    mezz_draw = Column(DECIMAL(18, 2), default=0)
    mezz_balance = Column(DECIMAL(18, 2), default=0)
    mezz_interest = Column(DECIMAL(18, 2), default=0)
    land_loan_draw = Column(DECIMAL(18, 2), default=0)
    land_loan_balance = Column(DECIMAL(18, 2), default=0)

    # Revenue
    gross_sales = Column(DECIMAL(18, 2), default=0)
    cost_of_sale = Column(DECIMAL(18, 2), default=0)
    net_sales = Column(DECIMAL(18, 2), default=0)
    loan_payoff_from_sales = Column(DECIMAL(18, 2), default=0)

    # Returns
    free_cashflow = Column(DECIMAL(18, 2), default=0)
    cumulative_cashflow = Column(DECIMAL(18, 2), default=0)

    project = relationship("Project", back_populates="monthly_cashflows")
