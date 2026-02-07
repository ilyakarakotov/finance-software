from sqlalchemy import Column, Integer, String, DECIMAL, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base


class BudgetBenchmark(Base):
    __tablename__ = "budget_benchmarks"

    benchmark_id = Column(Integer, primary_key=True, autoincrement=True)
    project_id = Column(Integer, ForeignKey("projects.project_id", ondelete="CASCADE"), nullable=True)
    code = Column(String(10), nullable=False)
    name = Column(String(100), nullable=False)
    benchmark_750k = Column(DECIMAL(10, 4))
    benchmark_950k = Column(DECIMAL(10, 4))
    benchmark_1500k = Column(DECIMAL(10, 4))
    benchmark_average = Column(DECIMAL(10, 4))

    project = relationship("Project", back_populates="budget_benchmarks")
