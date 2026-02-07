from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional
from decimal import Decimal

from app.database import get_db
from app.models.budget_benchmark import BudgetBenchmark
from app.models.budget_line_item import BudgetLineItem
from app.models.building import Building
from app.models.project import Project
from app.schemas.benchmark import BenchmarkCreate, BenchmarkUpdate, BenchmarkResponse, BenchmarkComparison

router = APIRouter(prefix="/benchmarks", tags=["benchmarks"])


@router.get("/{project_id}", response_model=List[BenchmarkResponse])
def list_benchmarks(project_id: int, db: Session = Depends(get_db)):
    """List benchmarks for a project (project-specific and global)."""
    project = db.query(Project).filter(Project.project_id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    return (
        db.query(BudgetBenchmark)
        .filter((BudgetBenchmark.project_id == project_id) | (BudgetBenchmark.project_id.is_(None)))
        .order_by(BudgetBenchmark.code)
        .all()
    )


@router.post("/", response_model=BenchmarkResponse)
def create_benchmark(data: BenchmarkCreate, db: Session = Depends(get_db)):
    """Create a new benchmark."""
    if data.project_id:
        project = db.query(Project).filter(Project.project_id == data.project_id).first()
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")

    benchmark = BudgetBenchmark(**data.model_dump())
    db.add(benchmark)
    db.commit()
    db.refresh(benchmark)
    return benchmark


@router.put("/{benchmark_id}", response_model=BenchmarkResponse)
def update_benchmark(benchmark_id: int, data: BenchmarkUpdate, db: Session = Depends(get_db)):
    """Update a benchmark."""
    benchmark = db.query(BudgetBenchmark).filter(BudgetBenchmark.benchmark_id == benchmark_id).first()
    if not benchmark:
        raise HTTPException(status_code=404, detail="Benchmark not found")

    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(benchmark, key, value)
    db.commit()
    db.refresh(benchmark)
    return benchmark


@router.delete("/{benchmark_id}")
def delete_benchmark(benchmark_id: int, db: Session = Depends(get_db)):
    """Delete a benchmark."""
    benchmark = db.query(BudgetBenchmark).filter(BudgetBenchmark.benchmark_id == benchmark_id).first()
    if not benchmark:
        raise HTTPException(status_code=404, detail="Benchmark not found")
    db.delete(benchmark)
    db.commit()
    return {"detail": "Benchmark deleted"}


@router.get("/{project_id}/comparison/{building_id}")
def compare_budget_to_benchmark(project_id: int, building_id: int, db: Session = Depends(get_db)):
    """Compare actual budget vs benchmarks for a building.

    Returns list of {division, name, actual_pct, benchmark_pct, variance, status}
    """
    # Verify project and building exist
    project = db.query(Project).filter(Project.project_id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    building = db.query(Building).filter(Building.building_id == building_id).first()
    if not building:
        raise HTTPException(status_code=404, detail="Building not found")

    # Get all budget items for the building
    budget_items = (
        db.query(BudgetLineItem)
        .filter(BudgetLineItem.building_id == building_id)
        .all()
    )

    if not budget_items:
        return []

    # Group by division_code, sum budget_amount
    division_totals = {}
    total_budget = Decimal("0")
    for item in budget_items:
        division = item.division_code or "UNASSIGNED"
        amount = item.budget_amount or Decimal("0")
        division_totals[division] = division_totals.get(division, Decimal("0")) + amount
        total_budget += amount

    if total_budget == 0:
        return []

    # Determine price range for selecting benchmark
    price_range = building.price_range or Decimal("950000")
    if price_range <= Decimal("750000"):
        benchmark_column = BudgetBenchmark.benchmark_750k
    elif price_range <= Decimal("1500000"):
        benchmark_column = BudgetBenchmark.benchmark_950k
    else:
        benchmark_column = BudgetBenchmark.benchmark_1500k

    # Get benchmarks
    benchmarks = (
        db.query(BudgetBenchmark)
        .filter((BudgetBenchmark.project_id == project_id) | (BudgetBenchmark.project_id.is_(None)))
        .all()
    )

    result = []
    for division, actual_amount in division_totals.items():
        actual_pct = float((actual_amount / total_budget) * 100) if total_budget > 0 else 0

        # Find matching benchmark
        benchmark = next((b for b in benchmarks if b.code == division), None)
        benchmark_pct = float(getattr(benchmark, "benchmark_average", 0) or 0) if benchmark else 0

        variance = actual_pct - benchmark_pct
        status = "on_track" if abs(variance) < 2 else ("over" if variance > 0 else "under")

        result.append({
            "division": division,
            "name": benchmark.name if benchmark else "Unknown",
            "actual_pct": round(actual_pct, 2),
            "benchmark_pct": benchmark_pct,
            "variance": round(variance, 2),
            "status": status,
        })

    return sorted(result, key=lambda x: x["division"])


@router.post("/seed")
def seed_benchmarks(db: Session = Depends(get_db)):
    """Seed benchmarks from built-in data."""
    existing = db.query(BudgetBenchmark).count()
    if existing > 0:
        return {"detail": f"Benchmarks already seeded ({existing} entries)"}

    # Import and run seeder if available
    try:
        from seed_cost_codes import seed_benchmarks as do_seed
        do_seed()
        count = db.query(BudgetBenchmark).count()
        return {"detail": f"Seeded {count} benchmarks"}
    except ImportError:
        return {"detail": "Seeding module not available"}
