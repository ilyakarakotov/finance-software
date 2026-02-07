from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List
from decimal import Decimal

from app.database import get_db
from app.models.loan_draw import LoanDraw, LoanDrawPeriod
from app.models.budget_line_item import BudgetLineItem
from app.models.project import Project
from app.schemas.loan_draw import (
    LoanDrawCreate,
    LoanDrawUpdate,
    LoanDrawResponse,
    LoanDrawSchedule,
    LoanDrawPeriodCreate,
    LoanDrawPeriodUpdate,
    LoanDrawPeriodResponse,
)

router = APIRouter(prefix="/loan-draws", tags=["loan-draws"])


@router.get("/{project_id}", response_model=List[LoanDrawResponse])
def list_loan_draws(project_id: int, db: Session = Depends(get_db)):
    """List all loan draw items for a project."""
    project = db.query(Project).filter(Project.project_id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    return (
        db.query(LoanDraw)
        .filter(LoanDraw.project_id == project_id)
        .order_by(LoanDraw.sort_order, LoanDraw.loan_draw_id)
        .all()
    )


@router.get("/{project_id}/schedule", response_model=List[LoanDrawSchedule])
def get_loan_draw_schedule(project_id: int, db: Session = Depends(get_db)):
    """Get full loan draw schedule with periods."""
    project = db.query(Project).filter(Project.project_id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    draws = (
        db.query(LoanDraw)
        .filter(LoanDraw.project_id == project_id)
        .order_by(LoanDraw.sort_order, LoanDraw.loan_draw_id)
        .all()
    )

    result = []
    for draw in draws:
        result.append(
            LoanDrawSchedule(
                loan_draw_id=draw.loan_draw_id,
                project_id=draw.project_id,
                building_id=draw.building_id,
                loan_number=draw.loan_number,
                inspection_date=draw.inspection_date,
                draw_category=draw.draw_category,
                description=draw.description,
                csi_code=draw.csi_code,
                budget_amount=draw.budget_amount,
                drawn_at_closing=draw.drawn_at_closing,
                sort_order=draw.sort_order,
                periods=[
                    LoanDrawPeriodResponse(
                        period_id=p.period_id,
                        loan_draw_id=p.loan_draw_id,
                        draw_number=p.draw_number,
                        draw_date=p.draw_date,
                        amount=p.amount,
                    )
                    for p in draw.periods
                ],
            )
        )
    return result


@router.post("/", response_model=LoanDrawResponse)
def create_loan_draw(data: LoanDrawCreate, db: Session = Depends(get_db)):
    """Create a new loan draw item."""
    project = db.query(Project).filter(Project.project_id == data.project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    draw = LoanDraw(**data.model_dump())
    db.add(draw)
    db.commit()
    db.refresh(draw)
    return draw


@router.put("/{loan_draw_id}", response_model=LoanDrawResponse)
def update_loan_draw(loan_draw_id: int, data: LoanDrawUpdate, db: Session = Depends(get_db)):
    """Update a loan draw item."""
    draw = db.query(LoanDraw).filter(LoanDraw.loan_draw_id == loan_draw_id).first()
    if not draw:
        raise HTTPException(status_code=404, detail="Loan draw not found")

    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(draw, key, value)
    db.commit()
    db.refresh(draw)
    return draw


@router.delete("/{loan_draw_id}")
def delete_loan_draw(loan_draw_id: int, db: Session = Depends(get_db)):
    """Delete a loan draw item."""
    draw = db.query(LoanDraw).filter(LoanDraw.loan_draw_id == loan_draw_id).first()
    if not draw:
        raise HTTPException(status_code=404, detail="Loan draw not found")
    db.delete(draw)
    db.commit()
    return {"detail": "Loan draw deleted"}


@router.post("/{loan_draw_id}/periods", response_model=LoanDrawPeriodResponse)
def create_loan_draw_period(loan_draw_id: int, data: LoanDrawPeriodCreate, db: Session = Depends(get_db)):
    """Add a period to a loan draw."""
    draw = db.query(LoanDraw).filter(LoanDraw.loan_draw_id == loan_draw_id).first()
    if not draw:
        raise HTTPException(status_code=404, detail="Loan draw not found")

    period = LoanDrawPeriod(loan_draw_id=loan_draw_id, **data.model_dump())
    db.add(period)
    db.commit()
    db.refresh(period)
    return period


@router.put("/periods/{period_id}", response_model=LoanDrawPeriodResponse)
def update_loan_draw_period(period_id: int, data: LoanDrawPeriodUpdate, db: Session = Depends(get_db)):
    """Update a loan draw period."""
    period = db.query(LoanDrawPeriod).filter(LoanDrawPeriod.period_id == period_id).first()
    if not period:
        raise HTTPException(status_code=404, detail="Loan draw period not found")

    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(period, key, value)
    db.commit()
    db.refresh(period)
    return period


@router.delete("/periods/{period_id}")
def delete_loan_draw_period(period_id: int, db: Session = Depends(get_db)):
    """Delete a loan draw period."""
    period = db.query(LoanDrawPeriod).filter(LoanDrawPeriod.period_id == period_id).first()
    if not period:
        raise HTTPException(status_code=404, detail="Loan draw period not found")
    db.delete(period)
    db.commit()
    return {"detail": "Loan draw period deleted"}


@router.post("/{project_id}/generate-from-budget", response_model=List[LoanDrawResponse])
def generate_loan_draws_from_budget(project_id: int, db: Session = Depends(get_db)):
    """Auto-generate loan draw items from budget totals.

    Maps budget categories:
    - construction + contingency + gc_fee → hard_costs
    - soft_costs → soft_costs
    - land → land
    """
    project = db.query(Project).filter(Project.project_id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    # Get all budget items for project
    items = (
        db.query(BudgetLineItem).filter(BudgetLineItem.project_id == project_id).all()
    )

    if not items:
        return []

    # Group by category and sum budget amounts
    category_totals = {}
    for item in items:
        category = item.category or "other"
        amount = item.budget_amount or Decimal("0")
        category_totals[category] = category_totals.get(category, Decimal("0")) + amount

    # Delete existing auto-generated draws
    db.query(LoanDraw).filter(LoanDraw.project_id == project_id).delete(synchronize_session="fetch")
    db.flush()

    created = []
    sort_order = 0

    # Map categories to loan draw categories
    mapping = {
        "land": ("land", "Land Acquisition"),
        "soft_costs": ("soft_costs", "Soft Costs"),
        "construction": ("hard_costs", "Construction"),
        "contingency": ("hard_costs", "Construction Contingency"),
        "gc_fee": ("hard_costs", "General Contractor Fee"),
    }

    # Group draws by draw_category
    draw_categories = {}
    for budget_category, amount in category_totals.items():
        if budget_category in mapping:
            draw_category, description = mapping[budget_category]
            if draw_category not in draw_categories:
                draw_categories[draw_category] = {
                    "description": description,
                    "amount": Decimal("0"),
                }
            draw_categories[draw_category]["amount"] += amount

    # Create loan draw items
    for draw_category, info in draw_categories.items():
        draw = LoanDraw(
            project_id=project_id,
            draw_category=draw_category,
            description=info["description"],
            budget_amount=info["amount"],
            sort_order=sort_order,
        )
        db.add(draw)
        created.append(draw)
        sort_order += 1

    db.commit()
    for draw in created:
        db.refresh(draw)
    return created


@router.get("/{project_id}/summary")
def get_loan_draw_summary(project_id: int, db: Session = Depends(get_db)):
    """Get summary of loan draws by draw_category."""
    project = db.query(Project).filter(Project.project_id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    # Group by draw_category and sum
    summary = (
        db.query(
            LoanDraw.draw_category,
            func.sum(LoanDraw.budget_amount).label("total_budget"),
            func.sum(LoanDraw.drawn_at_closing).label("total_drawn"),
            func.count(LoanDraw.loan_draw_id).label("item_count"),
        )
        .filter(LoanDraw.project_id == project_id)
        .group_by(LoanDraw.draw_category)
        .all()
    )

    return [
        {
            "draw_category": row[0],
            "total_budget": float(row[1] or 0),
            "total_drawn": float(row[2] or 0),
            "item_count": row[3],
        }
        for row in summary
    ]
