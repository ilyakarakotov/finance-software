from pydantic import BaseModel, ConfigDict
from typing import Optional


class BenchmarkCreate(BaseModel):
    project_id: Optional[int] = None
    code: str
    name: str
    benchmark_750k: Optional[float] = None
    benchmark_950k: Optional[float] = None
    benchmark_1500k: Optional[float] = None
    benchmark_average: Optional[float] = None


class BenchmarkUpdate(BaseModel):
    code: Optional[str] = None
    name: Optional[str] = None
    benchmark_750k: Optional[float] = None
    benchmark_950k: Optional[float] = None
    benchmark_1500k: Optional[float] = None
    benchmark_average: Optional[float] = None


class BenchmarkResponse(BaseModel):
    benchmark_id: int
    project_id: Optional[int] = None
    code: str
    name: str
    benchmark_750k: Optional[float] = None
    benchmark_950k: Optional[float] = None
    benchmark_1500k: Optional[float] = None
    benchmark_average: Optional[float] = None

    model_config = ConfigDict(from_attributes=True)


class BenchmarkComparison(BaseModel):
    benchmark_id: int
    code: str
    name: str
    actual_pct: float
    benchmark_pct: float
    variance: float

    model_config = ConfigDict(from_attributes=True)
