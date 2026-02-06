from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from typing import List

from app.database import get_db
from app.models.project import Project
from app.models.phase import Phase
from app.models.building import Building
from app.models.budget_line_item import BudgetLineItem
from app.schemas.budget import (
    BudgetLineItemCreate, BudgetLineItemUpdate, BudgetLineItemResponse,
    SCurvePreviewRequest, SCurvePreviewResponse,
)
from app.engine.s_curve import s_curve_distribution

router = APIRouter(prefix="/budget", tags=["budget"])


@router.get("/{project_id}", response_model=List[BudgetLineItemResponse])
def list_budget_items(project_id: int, db: Session = Depends(get_db)):
    return (
        db.query(BudgetLineItem)
        .filter(BudgetLineItem.project_id == project_id)
        .order_by(BudgetLineItem.category, BudgetLineItem.line_item_id)
        .all()
    )


@router.post("/", response_model=BudgetLineItemResponse)
def create_budget_item(data: BudgetLineItemCreate, db: Session = Depends(get_db)):
    item = BudgetLineItem(**data.model_dump())
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


@router.post("/bulk", response_model=List[BudgetLineItemResponse])
def bulk_create_budget_items(items: List[BudgetLineItemCreate], db: Session = Depends(get_db)):
    created = []
    for data in items:
        item = BudgetLineItem(**data.model_dump())
        db.add(item)
        created.append(item)
    db.commit()
    for item in created:
        db.refresh(item)
    return created


@router.put("/{line_item_id}", response_model=BudgetLineItemResponse)
def update_budget_item(line_item_id: int, data: BudgetLineItemUpdate, db: Session = Depends(get_db)):
    item = db.query(BudgetLineItem).filter(BudgetLineItem.line_item_id == line_item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Budget line item not found")
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(item, key, value)
    db.commit()
    db.refresh(item)
    return item


@router.delete("/{line_item_id}")
def delete_budget_item(line_item_id: int, db: Session = Depends(get_db)):
    item = db.query(BudgetLineItem).filter(BudgetLineItem.line_item_id == line_item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Budget line item not found")
    db.delete(item)
    db.commit()
    return {"detail": "Budget line item deleted"}


@router.post("/s-curve-preview", response_model=SCurvePreviewResponse)
def preview_s_curve(data: SCurvePreviewRequest):
    monthly = s_curve_distribution(data.total_amount, data.duration_months, data.steepness)
    return SCurvePreviewResponse(monthly_amounts=monthly)


@router.post("/{project_id}/generate-from-buildings", response_model=List[BudgetLineItemResponse])
def generate_budget_from_buildings(project_id: int, db: Session = Depends(get_db)):
    """Auto-generate construction, contingency, and GC fee line items from building data."""
    project = db.query(Project).filter(Project.project_id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    construction_cost_psf = float(project.construction_cost_psf or 0)
    contingency_pct = float(project.contingency_pct or 0.05)
    gc_fee_pct = float(project.gc_fee_pct or 0.12)
    sales_tax_rate = float(project.sales_tax_rate or 0)

    # Get all buildings for this project
    buildings = (
        db.query(Building)
        .join(Phase)
        .filter(Phase.project_id == project_id)
        .all()
    )

    # Delete existing auto-generated categories
    db.query(BudgetLineItem).filter(
        BudgetLineItem.project_id == project_id,
        BudgetLineItem.category.in_(["construction", "contingency", "gc_fee"]),
    ).delete(synchronize_session="fetch")
    db.flush()

    # Get remaining items (horizontal, soft_costs, land, other) for derived calcs
    remaining_items = (
        db.query(BudgetLineItem)
        .filter(BudgetLineItem.project_id == project_id)
        .all()
    )
    horizontal_items = [i for i in remaining_items if i.category == "horizontal"]
    soft_cost_items = [i for i in remaining_items if i.category == "soft_costs"]

    created = []

    # ── Per-building items ──
    all_contingency_amounts = []
    all_contingency_starts = []
    all_contingency_ends = []
    all_gc_fee_amounts = []

    for bldg in buildings:
        sf_per_unit = bldg.sf_per_unit or 0
        unit_count = bldg.unit_count or 0
        start = bldg.construction_start_month or 1
        duration = bldg.construction_duration or 6
        construction_amount = construction_cost_psf * sf_per_unit * unit_count

        # a) Construction line item
        item_c = BudgetLineItem(
            project_id=project_id,
            building_id=bldg.building_id,
            category="construction",
            description=f"Bldg {bldg.name}",
            budget_amount=round(construction_amount, 2),
            forecast_method="s_curve",
            start_month=start,
            duration_months=duration,
            s_curve_steepness=3,
            is_auto_generated=True,
        )
        db.add(item_c)
        created.append(item_c)

        # b) Contingency
        contingency_amount = construction_amount * contingency_pct
        item_cont = BudgetLineItem(
            project_id=project_id,
            building_id=bldg.building_id,
            category="contingency",
            description=f"Bldg {bldg.name} contingency",
            budget_amount=round(contingency_amount, 2),
            forecast_method="s_curve",
            start_month=start,
            duration_months=duration,
            s_curve_steepness=3,
            is_auto_generated=True,
        )
        db.add(item_cont)
        created.append(item_cont)
        all_contingency_amounts.append(contingency_amount)
        all_contingency_starts.append(start)
        all_contingency_ends.append(start + duration)

        # c) GC Fee on construction
        gc_fee_amount = construction_amount * gc_fee_pct
        item_gc = BudgetLineItem(
            project_id=project_id,
            building_id=bldg.building_id,
            category="gc_fee",
            description=f"GC Fee - Bldg {bldg.name}",
            budget_amount=round(gc_fee_amount, 2),
            forecast_method="s_curve",
            start_month=start,
            duration_months=duration,
            s_curve_steepness=3,
            is_auto_generated=True,
        )
        db.add(item_gc)
        created.append(item_gc)
        all_gc_fee_amounts.append(gc_fee_amount)

    # ── Project-level derived items ──

    # d) GC Fee on total contingency
    if all_contingency_amounts:
        total_contingency = sum(all_contingency_amounts)
        earliest_start = min(all_contingency_starts)
        latest_end = max(all_contingency_ends)
        gc_cont = BudgetLineItem(
            project_id=project_id, category="gc_fee",
            description="GC Fee - Contingency",
            budget_amount=round(total_contingency * gc_fee_pct, 2),
            forecast_method="s_curve",
            start_month=earliest_start,
            duration_months=latest_end - earliest_start,
            s_curve_steepness=3, is_auto_generated=True,
        )
        db.add(gc_cont)
        created.append(gc_cont)
        all_gc_fee_amounts.append(total_contingency * gc_fee_pct)

    # e) GC Fee on horizontal
    if horizontal_items:
        total_horiz = sum(float(i.budget_amount or 0) for i in horizontal_items)
        h_starts = [i.start_month for i in horizontal_items]
        h_ends = [i.start_month + i.duration_months for i in horizontal_items]
        gc_horiz = BudgetLineItem(
            project_id=project_id, category="gc_fee",
            description="GC Fee - Horizontal",
            budget_amount=round(total_horiz * gc_fee_pct, 2),
            forecast_method="s_curve",
            start_month=min(h_starts),
            duration_months=max(h_ends) - min(h_starts) if len(h_starts) > 0 else 7,
            s_curve_steepness=3, is_auto_generated=True,
        )
        db.add(gc_horiz)
        created.append(gc_horiz)
        all_gc_fee_amounts.append(total_horiz * gc_fee_pct)

    # f) GC Fee on soft costs
    if soft_cost_items:
        total_soft = sum(float(i.budget_amount or 0) for i in soft_cost_items)
        gc_soft = BudgetLineItem(
            project_id=project_id, category="gc_fee",
            description="GC Fee - Soft Costs",
            budget_amount=round(total_soft * gc_fee_pct, 2),
            forecast_method="s_curve",
            start_month=1, duration_months=6,
            s_curve_steepness=5, is_auto_generated=True,
        )
        db.add(gc_soft)
        created.append(gc_soft)
        all_gc_fee_amounts.append(total_soft * gc_fee_pct)

    # g) Horizontal contingency
    if horizontal_items:
        total_horiz = sum(float(i.budget_amount or 0) for i in horizontal_items)
        h_starts = [i.start_month for i in horizontal_items]
        h_ends = [i.start_month + i.duration_months for i in horizontal_items]
        horiz_cont = BudgetLineItem(
            project_id=project_id, category="contingency",
            description="Horizontal Contingency",
            budget_amount=round(total_horiz * contingency_pct, 2),
            forecast_method="s_curve",
            start_month=min(h_starts),
            duration_months=max(h_ends) - min(h_starts),
            s_curve_steepness=3, is_auto_generated=True,
        )
        db.add(horiz_cont)
        created.append(horiz_cont)

    # h) Sales Tax on all GC fees
    if all_gc_fee_amounts and sales_tax_rate > 0:
        total_gc_fees = sum(all_gc_fee_amounts)
        s_start = min(i.start_month for i in soft_cost_items) if soft_cost_items else 6
        sales_tax = BudgetLineItem(
            project_id=project_id, category="gc_fee",
            description="Sales Tax",
            budget_amount=round(total_gc_fees * sales_tax_rate, 2),
            forecast_method="s_curve",
            start_month=s_start, duration_months=29,
            s_curve_steepness=5, is_auto_generated=True,
        )
        db.add(sales_tax)
        created.append(sales_tax)

    db.commit()
    for item in created:
        db.refresh(item)
    return created
