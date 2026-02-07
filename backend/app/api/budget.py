from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from typing import List, Dict, Optional

from app.database import get_db
from app.models.project import Project
from app.models.phase import Phase
from app.models.building import Building
from app.models.budget_line_item import BudgetLineItem
from app.models.cost_code import CostCode
from app.schemas.budget import (
    BudgetLineItemCreate, BudgetLineItemUpdate, BudgetLineItemResponse,
    SCurvePreviewRequest, SCurvePreviewResponse,
)
from app.engine.s_curve import s_curve_distribution

router = APIRouter(prefix="/budget", tags=["budget"])


# ── Helper Functions ──

def _calculate_quantity(unit_type: str, building) -> float:
    """Auto-resolve quantity from building parameters based on unit type."""
    mapping = {
        "gsf": building.gross_sf or (building.sf_per_unit or 0) * (building.unit_count or 0),
        "far": building.far_sf or 0,
        "gar_sf": building.garage_sf or 0,
        "slab": building.slab_on_grade_sf or 0,
        "units": building.unit_count or 0,
        "months": building.construction_duration or 6,
        "weeks": (building.construction_duration or 6) * 4.345,
        "days": (building.construction_duration or 6) * 30.42,
    }
    return mapping.get(unit_type, 0)


def _map_division_to_category(division_number: str) -> str:
    """Map CSI division number to category."""
    DIVISION_MAP = {
        "01000": "soft_costs",
        "02000": "horizontal",
        "03000": "construction", "04000": "construction", "05000": "construction",
        "06000": "construction", "07000": "construction", "08000": "construction",
        "09000": "construction", "10000": "construction", "11000": "construction",
        "12000": "construction", "13000": "construction", "14000": "construction",
        "15000": "construction", "16000": "construction",
        "21000": "construction", "22000": "construction", "23000": "construction",
        "26000": "construction", "27000": "construction", "28000": "construction",
        "31000": "horizontal", "32000": "horizontal", "33000": "horizontal",
    }
    return DIVISION_MAP.get(division_number, "other")


def _compute_line_item(item, building=None):
    """Recompute all derived amounts for a budget line item."""
    std = round(float(item.quantity or 0) * float(item.unit_price or 0), 2)
    ps = round(float(item.ps_quantity or 0) * float(item.ps_unit_price or 0), 2)
    # Only override budget_amount if at least one cost path has values
    if std > 0 or ps > 0:
        item.standard_cost = std
        item.project_specific_cost = ps
        item.budget_amount = std + ps
    if building:
        net_sf = (building.gross_sf or building.total_sf or 0) - (building.garage_sf or 0)
        if net_sf > 0:
            item.sf_cost = round(float(item.budget_amount) / net_sf, 4)


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

    # Auto-compute amounts if applicable
    if item.building_id:
        building = db.query(Building).filter(Building.building_id == item.building_id).first()
        if building and item.unit_type:
            item.quantity = _calculate_quantity(item.unit_type, building)
        if building:
            _compute_line_item(item, building)
    else:
        _compute_line_item(item)

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

    # Auto-compute amounts if pricing fields were updated
    update_data = data.model_dump(exclude_unset=True)
    if any(f in update_data for f in ['quantity', 'unit_price', 'ps_quantity', 'ps_unit_price', 'unit_type']):
        building = None
        if item.building_id:
            building = db.query(Building).filter(Building.building_id == item.building_id).first()
        if item.unit_type and building:
            item.quantity = _calculate_quantity(item.unit_type, building)
        _compute_line_item(item, building)

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


@router.post("/calculate-quantity")
def calculate_quantity_endpoint(unit_type: str, building_id: int, db: Session = Depends(get_db)):
    """Calculate quantity from building parameters and unit type."""
    building = db.query(Building).filter(Building.building_id == building_id).first()
    if not building:
        raise HTTPException(status_code=404, detail="Building not found")
    qty = _calculate_quantity(unit_type, building)
    return {"unit_type": unit_type, "building_id": building_id, "quantity": qty}


@router.get("/{project_id}/tree")
def get_budget_tree(project_id: int, building_id: Optional[int] = None, contractor_id: Optional[int] = None, db: Session = Depends(get_db)):
    """Get budget items in hierarchical tree structure grouped by division."""
    q = db.query(BudgetLineItem).filter(BudgetLineItem.project_id == project_id)
    if building_id:
        q = q.filter(BudgetLineItem.building_id == building_id)
    if contractor_id:
        q = q.filter(BudgetLineItem.contractor_id == contractor_id)
    items = q.order_by(BudgetLineItem.sort_order, BudgetLineItem.line_item_id).all()

    # Build tree structure grouped by division_code
    tree = {}
    for item in items:
        div = item.division_code or item.category or "other"
        if div not in tree:
            tree[div] = {"division_code": div, "items": [], "total": 0}
        tree[div]["items"].append(item)
        tree[div]["total"] += float(item.budget_amount or 0)

    return sorted(tree.values(), key=lambda d: d["division_code"])


@router.get("/{project_id}/cost-code-tree")
def get_cost_code_budget_tree(project_id: int, building_id: Optional[int] = None, db: Session = Depends(get_db)):
    """Get budget items organized in 4-level cost code hierarchy (Division → Category → Subcategory → Item Code).
    Only returns items that have cost_code_id (cost-code-level items), excluding category-level items."""

    # Query budget items with cost codes
    q = (
        db.query(BudgetLineItem)
        .join(CostCode, BudgetLineItem.cost_code_id == CostCode.cost_code_id)
        .filter(
            BudgetLineItem.project_id == project_id,
            BudgetLineItem.cost_code_id.isnot(None)
        )
    )

    if building_id:
        q = q.filter(BudgetLineItem.building_id == building_id)

    items = q.order_by(
        CostCode.division_number,
        CostCode.category_number,
        CostCode.subcategory_number,
        CostCode.item_code
    ).all()

    # Build nested structure: Division → Category → Subcategory → Item Code
    divisions = {}

    for item in items:
        cc = item.cost_code
        div_key = (cc.division_number, cc.division_name)
        cat_key = (cc.category_number, cc.category_name)
        sub_key = (cc.subcategory_number, cc.subcategory_name)

        # Initialize division if not exists
        if div_key not in divisions:
            divisions[div_key] = {
                "division_number": cc.division_number,
                "division_name": cc.division_name,
                "total": 0,
                "categories": {}
            }

        # Initialize category if not exists
        if cat_key not in divisions[div_key]["categories"]:
            divisions[div_key]["categories"][cat_key] = {
                "category_number": cc.category_number,
                "category_name": cc.category_name,
                "total": 0,
                "subcategories": {}
            }

        # Initialize subcategory if not exists
        if sub_key not in divisions[div_key]["categories"][cat_key]["subcategories"]:
            divisions[div_key]["categories"][cat_key]["subcategories"][sub_key] = {
                "subcategory_number": cc.subcategory_number,
                "subcategory_name": cc.subcategory_name,
                "total": 0,
                "items": []
            }

        # Add item to subcategory
        item_amount = float(item.budget_amount or 0)
        item_obj = {
            "line_item_id": item.line_item_id,
            "item_code": cc.item_code,
            "item_name": cc.item_name,
            "unit_type": item.unit_type,
            "quantity": float(item.quantity or 0),
            "unit_price": float(item.unit_price or 0),
            "standard_cost": float(item.standard_cost or 0),
            "budget_amount": item_amount,
            "building_id": item.building_id,
            "description": item.description,
            "notes": item.notes,
        }
        divisions[div_key]["categories"][cat_key]["subcategories"][sub_key]["items"].append(item_obj)

        # Update totals
        divisions[div_key]["categories"][cat_key]["subcategories"][sub_key]["total"] += item_amount
        divisions[div_key]["categories"][cat_key]["total"] += item_amount
        divisions[div_key]["total"] += item_amount

    # Convert dict structure to list with nested lists
    result = []
    for div_key, div_data in sorted(divisions.items(), key=lambda x: x[0][0]):
        categories_list = []
        for cat_key, cat_data in sorted(div_data["categories"].items(), key=lambda x: x[0][0]):
            subcategories_list = []
            for sub_key, sub_data in sorted(cat_data["subcategories"].items(), key=lambda x: x[0][0]):
                subcategories_list.append({
                    "subcategory_number": sub_data["subcategory_number"],
                    "subcategory_name": sub_data["subcategory_name"],
                    "total": round(sub_data["total"], 2),
                    "items": sub_data["items"]
                })
            categories_list.append({
                "category_number": cat_data["category_number"],
                "category_name": cat_data["category_name"],
                "total": round(cat_data["total"], 2),
                "subcategories": subcategories_list
            })
        result.append({
            "division_number": div_data["division_number"],
            "division_name": div_data["division_name"],
            "total": round(div_data["total"], 2),
            "categories": categories_list
        })

    return result


@router.get("/{project_id}/by-contractor/{building_id}")
def get_budget_by_contractor(project_id: int, building_id: int, db: Session = Depends(get_db)):
    """Get budget items grouped by contractor for a specific building."""
    q = db.query(BudgetLineItem).filter(
        BudgetLineItem.project_id == project_id,
        BudgetLineItem.building_id == building_id
    ).order_by(BudgetLineItem.contractor_id, BudgetLineItem.line_item_id)
    items = q.all()

    # Group by contractor
    by_contractor = {}
    for item in items:
        contractor_name = item.contractor.name if item.contractor else "Unassigned"
        contractor_id = item.contractor_id or 0
        key = f"{contractor_id}:{contractor_name}"
        if key not in by_contractor:
            by_contractor[key] = {"contractor_id": contractor_id, "contractor_name": contractor_name, "items": [], "total": 0}
        by_contractor[key]["items"].append(item)
        by_contractor[key]["total"] += float(item.budget_amount or 0)

    return list(by_contractor.values())


@router.get("/{project_id}/totals")
def get_budget_totals(project_id: int, db: Session = Depends(get_db)):
    """Get aggregated budget totals across all buildings/contractors (TOTAL sheet equivalent)."""
    items = db.query(BudgetLineItem).filter(
        BudgetLineItem.project_id == project_id,
        BudgetLineItem.is_summary_row == False
    ).all()

    by_division = {}
    by_category = {}
    total_budget = 0
    total_standard = 0
    total_ps = 0

    for item in items:
        amt = float(item.budget_amount or 0)
        total_budget += amt
        total_standard += float(item.standard_cost or 0)
        total_ps += float(item.project_specific_cost or 0)

        div = item.division_code or "other"
        by_division[div] = by_division.get(div, 0) + amt
        cat = item.category or "other"
        by_category[cat] = by_category.get(cat, 0) + amt

    return {
        "total_budget": round(total_budget, 2),
        "total_standard_cost": round(total_standard, 2),
        "total_project_specific": round(total_ps, 2),
        "by_division": by_division,
        "by_category": by_category,
    }


@router.get("/{project_id}/sf-analysis")
def get_sf_analysis(project_id: int, building_id: Optional[int] = None, db: Session = Depends(get_db)):
    """Get per-square-foot cost analysis by division."""
    # Get building SF data
    if building_id:
        building = db.query(Building).filter(Building.building_id == building_id).first()
        net_sf = (building.gross_sf or building.total_sf or 0) - (building.garage_sf or 0) if building else 0
    else:
        buildings = db.query(Building).join(Phase).filter(Phase.project_id == project_id).all()
        net_sf = sum((b.gross_sf or b.total_sf or 0) - (b.garage_sf or 0) for b in buildings)

    if net_sf <= 0:
        return {"net_sf": 0, "divisions": [], "total_sf_cost": 0}

    q = db.query(BudgetLineItem).filter(BudgetLineItem.project_id == project_id)
    if building_id:
        q = q.filter(BudgetLineItem.building_id == building_id)
    items = q.all()

    by_division = {}
    total = 0
    for item in items:
        div = item.division_code or item.category or "other"
        amt = float(item.budget_amount or 0)
        by_division[div] = by_division.get(div, 0) + amt
        total += amt

    divisions = [
        {
            "division": div,
            "total": round(amt, 2),
            "sf_cost": round(amt / net_sf, 2),
            "pct_of_total": round(amt / total * 100, 2) if total > 0 else 0
        }
        for div, amt in sorted(by_division.items())
    ]

    return {
        "net_sf": net_sf,
        "total_sf_cost": round(total / net_sf, 2) if net_sf > 0 else 0,
        "total_budget": round(total, 2),
        "divisions": divisions
    }


@router.post("/{project_id}/generate-from-template")
def generate_from_template(project_id: int, building_id: Optional[int] = None, db: Session = Depends(get_db)):
    """Generate budget items from curated cost code template with realistic residential construction pricing."""

    # Curated template: commonly-used cost codes for residential townhome construction
    # Format: (item_code, unit_type, pct_of_total_construction)
    TEMPLATE_ITEMS = [
        # 01000 General Conditions (~8%)
        ("01311", "months", 0.015),   # Project Management (L)
        ("01312", "months", 0.005),   # Project Management (M)
        ("01321", "months", 0.012),   # Site Management (L)
        ("01331", "months", 0.008),   # Site Labor (L)
        ("01335", "months", 0.005),   # Site Labor (O)
        ("01511", "months", 0.010),   # Temporary Facilities (L)
        ("01515", "months", 0.008),   # Temporary Facilities (O)
        ("01711", "ls", 0.005),       # Closeout (L)
        ("01715", "ls", 0.005),       # Closeout (O)
        # 03000 Concrete (~16%)
        ("03311", "gsf", 0.035),      # Foundations (L)
        ("03312", "gsf", 0.045),      # Foundations (M)
        ("03313", "gsf", 0.020),      # Foundations (S)
        ("03321", "gsf", 0.010),      # Foundation Hardware (L)
        ("03322", "gsf", 0.025),      # Foundation Hardware (M)
        ("03331", "gsf", 0.015),      # Slabs (L)
        ("03332", "gsf", 0.010),      # Slabs (M)
        # 05000 Metals (~6%)
        ("05111", "gsf", 0.020),      # Structural Steel (L)
        ("05112", "gsf", 0.025),      # Structural Steel (M)
        ("05519", "gsf", 0.015),      # Metal Fabrications (CO)
        # 06000 Woods & Plastics (~16%)
        ("06111", "gsf", 0.040),      # Rough Carpentry (L)
        ("06112", "gsf", 0.055),      # Rough Carpentry (M)
        ("06113", "gsf", 0.015),      # Rough Carpentry (S)
        ("06211", "gsf", 0.020),      # Finish Carpentry (L)
        ("06212", "gsf", 0.020),      # Finish Carpentry (M)
        ("06411", "units", 0.010),    # Casework (L)
        # 07000 Thermal & Moisture (~9%)
        ("07211", "gsf", 0.025),      # Insulation (L)
        ("07212", "gsf", 0.025),      # Insulation (M)
        ("07411", "gsf", 0.015),      # Roofing (L)
        ("07412", "gsf", 0.015),      # Roofing (M)
        ("07611", "gsf", 0.010),      # Flashing & Sheet Metal (L)
        # 08000 Doors & Windows (~9%)
        ("08111", "units", 0.010),    # Metal Doors (L)
        ("08112", "units", 0.015),    # Metal Doors (M)
        ("08511", "units", 0.025),    # Windows (L)
        ("08512", "units", 0.030),    # Windows (M)
        # 09000 Finishes (~14%)
        ("09211", "gsf", 0.025),      # Plaster/Gypsum Board (L)
        ("09212", "gsf", 0.020),      # Plaster/Gypsum Board (M)
        ("09311", "gsf", 0.010),      # Ceramic/Porcelain Tile (L)
        ("09312", "gsf", 0.015),      # Ceramic/Porcelain Tile (M)
        ("09611", "gsf", 0.015),      # Flooring (L)
        ("09612", "gsf", 0.020),      # Flooring (M)
        ("09911", "gsf", 0.015),      # Painting (L)
        ("09912", "gsf", 0.010),      # Painting (M)
        # 15000 Mechanical (~10%)
        ("15411", "units", 0.025),    # Plumbing (L)
        ("15412", "units", 0.020),    # Plumbing (M)
        ("15711", "gsf", 0.025),      # HVAC (L)
        ("15712", "gsf", 0.025),      # HVAC (M)
        # 16000 Electrical (~9%)
        ("16111", "gsf", 0.025),      # Wiring (L)
        ("16112", "gsf", 0.025),      # Wiring (M)
        ("16411", "units", 0.015),    # Lighting Fixtures (L)
        ("16412", "units", 0.020),    # Lighting Fixtures (M)
    ]

    # Get project to access construction_cost_psf
    project = db.query(Project).filter(Project.project_id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    construction_cost_psf = float(project.construction_cost_psf or 150)  # default to $150/SF

    # Determine which buildings to process
    if building_id:
        buildings = [db.query(Building).filter(Building.building_id == building_id).first()]
        if not buildings[0]:
            raise HTTPException(status_code=404, detail="Building not found")
    else:
        # Get all buildings in project
        buildings = (
            db.query(Building)
            .join(Phase)
            .filter(Phase.project_id == project_id)
            .all()
        )

    if not buildings:
        raise HTTPException(status_code=400, detail="No buildings found for project")

    created = []

    for bldg in buildings:
        # Delete existing cost-code items for this building
        db.query(BudgetLineItem).filter(
            BudgetLineItem.project_id == project_id,
            BudgetLineItem.building_id == bldg.building_id,
            BudgetLineItem.cost_code_id.isnot(None)
        ).delete(synchronize_session="fetch")
        db.flush()

        gross_sf = bldg.gross_sf or (bldg.sf_per_unit or 0) * (bldg.unit_count or 0)
        if gross_sf <= 0:
            continue

        # Calculate total construction cost for this building
        total_construction_cost = construction_cost_psf * gross_sf

        # Process each template item
        sort_order = 0
        for item_code, unit_type, pct_of_total in TEMPLATE_ITEMS:
            # Look up cost code by item_code
            cost_code = db.query(CostCode).filter(CostCode.item_code == item_code).first()
            if not cost_code:
                # Skip silently if code doesn't exist
                continue

            # Calculate item total based on percentage
            item_total = total_construction_cost * pct_of_total

            # Calculate quantity based on unit type
            quantity = _calculate_quantity(unit_type, bldg)

            # Calculate unit price (item_total / quantity, or just item_total if quantity is 0)
            if quantity > 0:
                unit_price = item_total / quantity
            else:
                unit_price = item_total

            # Create budget line item
            item = BudgetLineItem(
                project_id=project_id,
                building_id=bldg.building_id,
                category=_map_division_to_category(cost_code.division_number),
                subcategory=cost_code.category_name,
                csi_code=cost_code.item_code,
                description=cost_code.item_name,
                division_code=cost_code.division_number,
                cost_code_id=cost_code.cost_code_id,
                unit_type=unit_type,
                quantity=round(quantity, 4),
                unit_price=round(unit_price, 4),
                standard_cost=round(item_total, 2),
                budget_amount=round(item_total, 2),
                hierarchy_level=4,  # Leaf item in 4-level hierarchy
                sort_order=sort_order,
                is_auto_generated=True,
            )
            sort_order += 1

            db.add(item)
            created.append(item)

    db.commit()
    for item in created:
        db.refresh(item)
    return created


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

    sort_counter = 100  # Start sort_order at 100 for construction items

    for bldg in buildings:
        sf_per_unit = bldg.sf_per_unit or 0
        unit_count = bldg.unit_count or 0
        start = bldg.construction_start_month or 1
        duration = bldg.construction_duration or 6
        gross_sf = sf_per_unit * unit_count  # Building's gross square feet
        construction_amount = construction_cost_psf * gross_sf

        # a) Construction line item
        item_c = BudgetLineItem(
            project_id=project_id,
            building_id=bldg.building_id,
            category="construction",
            description=f"{bldg.name}",
            budget_amount=round(construction_amount, 2),
            standard_cost=round(construction_amount, 2),
            division_code="03000",
            hierarchy_level=2,
            unit_type="gsf",
            quantity=gross_sf,
            unit_price=construction_cost_psf,
            sort_order=sort_counter,
            forecast_method="s_curve",
            start_month=start,
            duration_months=duration,
            s_curve_steepness=3,
            is_auto_generated=True,
        )
        sort_counter += 1
        db.add(item_c)
        created.append(item_c)

        # b) Contingency
        contingency_amount = construction_amount * contingency_pct
        item_cont = BudgetLineItem(
            project_id=project_id,
            building_id=bldg.building_id,
            category="contingency",
            description=f"{bldg.name} Contingency",
            budget_amount=round(contingency_amount, 2),
            standard_cost=round(contingency_amount, 2),
            division_code="01000",
            hierarchy_level=2,
            sort_order=200 + sort_counter - 100,
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
            description=f"GC Fee - {bldg.name}",
            budget_amount=round(gc_fee_amount, 2),
            standard_cost=round(gc_fee_amount, 2),
            division_code="01000",
            hierarchy_level=2,
            sort_order=300 + sort_counter - 100,
            forecast_method="s_curve",
            start_month=start,
            duration_months=duration,
            s_curve_steepness=3,
            is_auto_generated=True,
        )
        db.add(item_gc)
        created.append(item_gc)
        all_gc_fee_amounts.append(gc_fee_amount)

        sort_counter += 1

    # ── Project-level derived items ──

    # d) GC Fee on total contingency
    if all_contingency_amounts:
        total_contingency = sum(all_contingency_amounts)
        earliest_start = min(all_contingency_starts)
        latest_end = max(all_contingency_ends)
        gc_cont_amount = total_contingency * gc_fee_pct
        gc_cont = BudgetLineItem(
            project_id=project_id, category="gc_fee",
            description="GC Fee - Contingency",
            budget_amount=round(gc_cont_amount, 2),
            standard_cost=round(gc_cont_amount, 2),
            division_code="01000",
            hierarchy_level=2,
            sort_order=310,
            forecast_method="s_curve",
            start_month=earliest_start,
            duration_months=latest_end - earliest_start,
            s_curve_steepness=3, is_auto_generated=True,
        )
        db.add(gc_cont)
        created.append(gc_cont)
        all_gc_fee_amounts.append(gc_cont_amount)

    # e) GC Fee on horizontal
    if horizontal_items:
        total_horiz = sum(float(i.budget_amount or 0) for i in horizontal_items)
        h_starts = [i.start_month for i in horizontal_items]
        h_ends = [i.start_month + i.duration_months for i in horizontal_items]
        gc_horiz_amount = total_horiz * gc_fee_pct
        gc_horiz = BudgetLineItem(
            project_id=project_id, category="gc_fee",
            description="GC Fee - Horizontal",
            budget_amount=round(gc_horiz_amount, 2),
            standard_cost=round(gc_horiz_amount, 2),
            division_code="01000",
            hierarchy_level=2,
            sort_order=320,
            forecast_method="s_curve",
            start_month=min(h_starts),
            duration_months=max(h_ends) - min(h_starts) if len(h_starts) > 0 else 7,
            s_curve_steepness=3, is_auto_generated=True,
        )
        db.add(gc_horiz)
        created.append(gc_horiz)
        all_gc_fee_amounts.append(gc_horiz_amount)

    # f) GC Fee on soft costs
    if soft_cost_items:
        total_soft = sum(float(i.budget_amount or 0) for i in soft_cost_items)
        gc_soft_amount = total_soft * gc_fee_pct
        gc_soft = BudgetLineItem(
            project_id=project_id, category="gc_fee",
            description="GC Fee - Soft Costs",
            budget_amount=round(gc_soft_amount, 2),
            standard_cost=round(gc_soft_amount, 2),
            division_code="01000",
            hierarchy_level=2,
            sort_order=330,
            forecast_method="s_curve",
            start_month=1, duration_months=6,
            s_curve_steepness=5, is_auto_generated=True,
        )
        db.add(gc_soft)
        created.append(gc_soft)
        all_gc_fee_amounts.append(gc_soft_amount)

    # g) Horizontal contingency
    if horizontal_items:
        total_horiz = sum(float(i.budget_amount or 0) for i in horizontal_items)
        h_starts = [i.start_month for i in horizontal_items]
        h_ends = [i.start_month + i.duration_months for i in horizontal_items]
        horiz_cont_amount = total_horiz * contingency_pct
        horiz_cont = BudgetLineItem(
            project_id=project_id, category="contingency",
            description="Horizontal Contingency",
            budget_amount=round(horiz_cont_amount, 2),
            standard_cost=round(horiz_cont_amount, 2),
            division_code="02000",
            hierarchy_level=2,
            sort_order=340,
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
        tax_amount = total_gc_fees * sales_tax_rate
        sales_tax = BudgetLineItem(
            project_id=project_id, category="gc_fee",
            description="Sales Tax",
            budget_amount=round(tax_amount, 2),
            standard_cost=round(tax_amount, 2),
            division_code="01000",
            hierarchy_level=2,
            sort_order=350,
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
