from sqlalchemy import Column, Integer, String, DECIMAL, DateTime, Boolean
from sqlalchemy.orm import relationship
from app.database import Base


class Project(Base):
    __tablename__ = "projects"

    project_id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(255), nullable=False)
    address = Column(String(500))
    lot_size_acres = Column(DECIMAL(10, 2))
    start_date = Column(DateTime)
    total_units = Column(Integer)
    total_sf = Column(Integer)

    # Cost percentages (defaults from Excel proforma)
    cost_of_sale_pct = Column(DECIMAL(10, 6), default=0.065)     # Excel M39: 6.5%
    gc_fee_pct = Column(DECIMAL(10, 6), default=0.12)            # Excel: 12%
    contingency_pct = Column(DECIMAL(10, 6), default=0.12)       # Excel: 12% (was 5%)
    soft_costs_pct = Column(DECIMAL(10, 6), default=0.12)        # Excel M50: 12%
    sales_tax_rate = Column(DECIMAL(10, 6), default=0.0)
    construction_cost_psf = Column(DECIMAL(10, 2), default=0)

    # Capital structure defaults (from Excel proforma)
    gp_equity_pct = Column(DECIMAL(10, 6), default=0.59)         # Excel G24: 59%
    preferred_return_rate = Column(DECIMAL(10, 6), default=0.18)  # Excel M5: 18%
    senior_debt_rate = Column(DECIMAL(10, 6), default=0.11)      # Excel D30: 11%
    loan_release_pct = Column(DECIMAL(10, 6), default=1.15)      # Excel F30: 1.15
    land_loan_origination_pct = Column(DECIMAL(10, 6), default=0.03)  # Excel C30: 3%

    # LTC ratio toggle
    use_ltc_ratio = Column(Boolean, default=False)
    ltc_ratio = Column(DECIMAL(5, 4), nullable=True)

    phases = relationship("Phase", back_populates="project", cascade="all, delete-orphan")
    budget_line_items = relationship("BudgetLineItem", back_populates="project", cascade="all, delete-orphan")
    capital_tranches = relationship("CapitalStackTranche", back_populates="project", cascade="all, delete-orphan")
    promote_tiers = relationship("PromoteTier", back_populates="project", cascade="all, delete-orphan")
    monthly_cashflows = relationship("MonthlyCashflow", back_populates="project", cascade="all, delete-orphan")
    loan_draws = relationship("LoanDraw", back_populates="project", cascade="all, delete-orphan")
    builders_capital_mappings = relationship("BuildersCapitalMapping", back_populates="project", cascade="all, delete-orphan")
    budget_benchmarks = relationship("BudgetBenchmark", back_populates="project", cascade="all, delete-orphan")
