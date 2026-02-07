from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app.models.cost_code import CostCode
from app.schemas.cost_code import CostCodeCreate, CostCodeUpdate, CostCodeResponse, CostCodeTree

router = APIRouter(prefix="/cost-codes", tags=["cost-codes"])


@router.get("/", response_model=List[CostCodeResponse])
def list_cost_codes(
    division: str = Query(None),
    category: str = Query(None),
    db: Session = Depends(get_db),
):
    q = db.query(CostCode)
    if division:
        q = q.filter(CostCode.division_number == division)
    if category:
        q = q.filter(CostCode.category_number == category)
    return q.order_by(CostCode.item_code).all()


@router.get("/tree")
def get_cost_code_tree(db: Session = Depends(get_db)):
    """Return tree-structured hierarchy of cost codes by division/category/subcategory."""
    codes = db.query(CostCode).order_by(CostCode.division_number, CostCode.category_number, CostCode.subcategory_number, CostCode.item_code).all()

    # Build tree: divisions → categories → subcategories → items
    tree = {}
    for code in codes:
        div_key = code.division_number
        if div_key not in tree:
            tree[div_key] = {
                "division_number": div_key,
                "division_name": code.division_name,
                "categories": {},
            }
        cat_key = code.category_number
        if cat_key not in tree[div_key]["categories"]:
            tree[div_key]["categories"][cat_key] = {
                "category_number": cat_key,
                "category_name": code.category_name,
                "subcategories": {},
            }
        sub_key = code.subcategory_number
        cats = tree[div_key]["categories"][cat_key]
        if sub_key not in cats["subcategories"]:
            cats["subcategories"][sub_key] = {
                "subcategory_number": sub_key,
                "subcategory_name": code.subcategory_name,
                "items": [],
            }
        cats["subcategories"][sub_key]["items"].append(code)

    # Convert dicts to lists
    result = []
    for div in sorted(tree.values(), key=lambda d: d["division_number"]):
        div_node = {**div, "categories": []}
        for cat in sorted(div["categories"].values(), key=lambda c: c["category_number"]):
            cat_node = {**cat, "subcategories": []}
            for sub in sorted(cat["subcategories"].values(), key=lambda s: s["subcategory_number"]):
                cat_node["subcategories"].append(sub)
            div_node["categories"].append(cat_node)
        result.append(div_node)
    return result


@router.get("/search", response_model=List[CostCodeResponse])
def search_cost_codes(q: str = Query(..., min_length=1), db: Session = Depends(get_db)):
    """Search cost codes by item code, name, category, or division."""
    return (
        db.query(CostCode)
        .filter(
            (CostCode.item_code.ilike(f"%{q}%"))
            | (CostCode.item_name.ilike(f"%{q}%"))
            | (CostCode.category_name.ilike(f"%{q}%"))
            | (CostCode.division_name.ilike(f"%{q}%"))
        )
        .limit(50)
        .all()
    )


@router.post("/", response_model=CostCodeResponse)
def create_cost_code(data: CostCodeCreate, db: Session = Depends(get_db)):
    code = CostCode(**data.model_dump())
    db.add(code)
    db.commit()
    db.refresh(code)
    return code


@router.put("/{cost_code_id}", response_model=CostCodeResponse)
def update_cost_code(cost_code_id: int, data: CostCodeUpdate, db: Session = Depends(get_db)):
    code = db.query(CostCode).filter(CostCode.cost_code_id == cost_code_id).first()
    if not code:
        raise HTTPException(status_code=404, detail="Cost code not found")
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(code, key, value)
    db.commit()
    db.refresh(code)
    return code


@router.delete("/{cost_code_id}")
def delete_cost_code(cost_code_id: int, db: Session = Depends(get_db)):
    code = db.query(CostCode).filter(CostCode.cost_code_id == cost_code_id).first()
    if not code:
        raise HTTPException(status_code=404, detail="Cost code not found")
    db.delete(code)
    db.commit()
    return {"detail": "Cost code deleted"}
