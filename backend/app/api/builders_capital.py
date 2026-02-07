from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List
from decimal import Decimal
import math

from app.database import get_db
from app.models.builders_capital import BuildersCapitalMapping
from app.models.budget_line_item import BudgetLineItem
from app.models.project import Project
from app.schemas.builders_capital import BCMappingCreate, BCMappingUpdate, BCMappingResponse, BCSummary

router = APIRouter(prefix="/builders-capital", tags=["builders-capital"])


@router.get("/{project_id}", response_model=List[BCMappingResponse])
def list_bc_mappings(project_id: int, db: Session = Depends(get_db)):
    """List all builders capital mappings for a project."""
    project = db.query(Project).filter(Project.project_id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    return (
        db.query(BuildersCapitalMapping)
        .filter(BuildersCapitalMapping.project_id == project_id)
        .order_by(BuildersCapitalMapping.sort_order, BuildersCapitalMapping.mapping_id)
        .all()
    )


@router.post("/", response_model=BCMappingResponse)
def create_bc_mapping(data: BCMappingCreate, db: Session = Depends(get_db)):
    """Create a new BC mapping. Computes amount_with_tax and final_amount."""
    project = db.query(Project).filter(Project.project_id == data.project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    # Compute derived fields
    amount = Decimal(str(data.amount))
    tax_rate = Decimal(str(data.tax_rate)) / Decimal("100")
    amount_with_tax = Decimal(str(math.ceil(float(amount * (1 + tax_rate)) / 100) * 100))
    adjustment = Decimal(str(data.adjustment))
    final_amount = amount_with_tax + adjustment

    mapping_data = data.model_dump(exclude={"amount_with_tax", "final_amount"})
    mapping = BuildersCapitalMapping(
        **mapping_data,
        amount_with_tax=amount_with_tax,
        final_amount=final_amount,
    )
    db.add(mapping)
    db.commit()
    db.refresh(mapping)
    return mapping


@router.put("/{mapping_id}", response_model=BCMappingResponse)
def update_bc_mapping(mapping_id: int, data: BCMappingUpdate, db: Session = Depends(get_db)):
    """Update a BC mapping. Recomputes amount_with_tax and final_amount."""
    mapping = db.query(BuildersCapitalMapping).filter(BuildersCapitalMapping.mapping_id == mapping_id).first()
    if not mapping:
        raise HTTPException(status_code=404, detail="BC mapping not found")

    # Update fields
    for key, value in data.model_dump(exclude_unset=True).items():
        if key not in ["amount_with_tax", "final_amount"]:
            setattr(mapping, key, value)

    # Recompute amount_with_tax and final_amount
    amount = Decimal(str(mapping.amount))
    tax_rate = Decimal(str(mapping.tax_rate)) / Decimal("100")
    amount_with_tax = Decimal(str(math.ceil(float(amount * (1 + tax_rate)) / 100) * 100))
    adjustment = Decimal(str(mapping.adjustment))
    final_amount = amount_with_tax + adjustment

    mapping.amount_with_tax = amount_with_tax
    mapping.final_amount = final_amount

    db.commit()
    db.refresh(mapping)
    return mapping


@router.delete("/{mapping_id}")
def delete_bc_mapping(mapping_id: int, db: Session = Depends(get_db)):
    """Delete a BC mapping."""
    mapping = db.query(BuildersCapitalMapping).filter(BuildersCapitalMapping.mapping_id == mapping_id).first()
    if not mapping:
        raise HTTPException(status_code=404, detail="BC mapping not found")
    db.delete(mapping)
    db.commit()
    return {"detail": "BC mapping deleted"}


@router.post("/{project_id}/generate", response_model=List[BCMappingResponse])
def generate_bc_mappings(project_id: int, db: Session = Depends(get_db)):
    """Auto-generate BC mappings from budget totals with tax markup.

    Maps to BC categories (M-100100, M-100200, etc.) and applies tax markup.
    Rounding: amount_with_tax = ceil(amount * (1 + tax_rate) / 100) * 100
    """
    project = db.query(Project).filter(Project.project_id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    # Get all budget items for project
    items = db.query(BudgetLineItem).filter(BudgetLineItem.project_id == project_id).all()

    if not items:
        return []

    # Group by category/subcategory and sum budget amounts
    category_totals = {}
    for item in items:
        category = item.category or "other"
        subcategory = item.subcategory or "general"
        key = f"{category}:{subcategory}"
        amount = item.budget_amount or Decimal("0")
        category_totals[key] = category_totals.get(key, Decimal("0")) + amount

    # Delete existing auto-generated mappings
    db.query(BuildersCapitalMapping).filter(BuildersCapitalMapping.project_id == project_id).delete(
        synchronize_session="fetch"
    )
    db.flush()

    # Map budget categories to BC categories
    bc_mapping = {
        "land:general": ("M-100100", "Land Acquisition", Decimal("0")),
        "soft_costs:general": ("M-100200", "Soft Costs", Decimal("0.08")),
        "construction:general": ("M-100300", "Hard Costs - Construction", Decimal("0.10")),
        "contingency:general": ("M-100400", "Contingency", Decimal("0.10")),
        "gc_fee:general": ("M-100500", "General Contractor Fee", Decimal("0.08")),
    }

    created = []
    sort_order = 0

    for key, amount in category_totals.items():
        bc_category, description, tax_rate = bc_mapping.get(key, (f"M-{key}", key, Decimal("0.08")))

        # Compute amount_with_tax
        amount_decimal = Decimal(str(amount))
        amount_with_tax = Decimal(str(math.ceil(float(amount_decimal * (1 + tax_rate)) / 100) * 100))
        final_amount = amount_with_tax

        mapping = BuildersCapitalMapping(
            project_id=project_id,
            bc_category=bc_category,
            description=description,
            amount=amount_decimal,
            tax_rate=float(tax_rate * 100),
            amount_with_tax=amount_with_tax,
            adjustment=Decimal("0"),
            final_amount=final_amount,
            sort_order=sort_order,
        )
        db.add(mapping)
        created.append(mapping)
        sort_order += 1

    db.commit()
    for mapping in created:
        db.refresh(mapping)
    return created


@router.get("/{project_id}/summary")
def get_bc_summary(project_id: int, db: Session = Depends(get_db)):
    """Get pivot summary of BC mappings by category."""
    project = db.query(Project).filter(Project.project_id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    # Group by bc_category and sum
    summary = (
        db.query(
            BuildersCapitalMapping.bc_category,
            func.sum(BuildersCapitalMapping.amount).label("total_amount"),
            func.sum(BuildersCapitalMapping.amount_with_tax).label("total_with_tax"),
            func.sum(BuildersCapitalMapping.final_amount).label("total_final"),
            func.count(BuildersCapitalMapping.mapping_id).label("item_count"),
        )
        .filter(BuildersCapitalMapping.project_id == project_id)
        .group_by(BuildersCapitalMapping.bc_category)
        .all()
    )

    return [
        {
            "bc_category": row[0],
            "total_amount": float(row[1] or 0),
            "total_with_tax": float(row[2] or 0),
            "total_final": float(row[3] or 0),
            "item_count": row[4],
        }
        for row in summary
    ]
