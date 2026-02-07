from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app.models.contractor import Contractor
from app.models.building import Building
from app.schemas.contractor import ContractorCreate, ContractorUpdate, ContractorResponse

router = APIRouter(prefix="/contractors", tags=["contractors"])


@router.get("/{building_id}", response_model=List[ContractorResponse])
def list_contractors(building_id: int, db: Session = Depends(get_db)):
    """List all contractors for a building."""
    building = db.query(Building).filter(Building.building_id == building_id).first()
    if not building:
        raise HTTPException(status_code=404, detail="Building not found")
    return (
        db.query(Contractor)
        .filter(Contractor.building_id == building_id)
        .order_by(Contractor.contractor_id)
        .all()
    )


@router.post("/", response_model=ContractorResponse)
def create_contractor(data: ContractorCreate, db: Session = Depends(get_db)):
    """Create a new contractor."""
    building = db.query(Building).filter(Building.building_id == data.building_id).first()
    if not building:
        raise HTTPException(status_code=404, detail="Building not found")

    contractor = Contractor(**data.model_dump())
    db.add(contractor)
    db.commit()
    db.refresh(contractor)
    return contractor


@router.put("/{contractor_id}", response_model=ContractorResponse)
def update_contractor(contractor_id: int, data: ContractorUpdate, db: Session = Depends(get_db)):
    """Update a contractor."""
    contractor = db.query(Contractor).filter(Contractor.contractor_id == contractor_id).first()
    if not contractor:
        raise HTTPException(status_code=404, detail="Contractor not found")

    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(contractor, key, value)
    db.commit()
    db.refresh(contractor)
    return contractor


@router.delete("/{contractor_id}")
def delete_contractor(contractor_id: int, db: Session = Depends(get_db)):
    """Delete a contractor."""
    contractor = db.query(Contractor).filter(Contractor.contractor_id == contractor_id).first()
    if not contractor:
        raise HTTPException(status_code=404, detail="Contractor not found")
    db.delete(contractor)
    db.commit()
    return {"detail": "Contractor deleted"}


@router.post("/{building_id}/seed-defaults", response_model=List[ContractorResponse])
def seed_default_contractors(building_id: int, db: Session = Depends(get_db)):
    """Create standard GCX/GCD/GCH contractor set for a building."""
    building = db.query(Building).filter(Building.building_id == building_id).first()
    if not building:
        raise HTTPException(status_code=404, detail="Building not found")

    # Check if defaults already exist
    existing = db.query(Contractor).filter(Contractor.building_id == building_id).count()
    if existing > 0:
        return db.query(Contractor).filter(Contractor.building_id == building_id).all()

    defaults = [
        {
            "building_id": building_id,
            "name": "Site GC",
            "code": "GCX",
            "scope_description": "Division 2: Site Construction",
        },
        {
            "building_id": building_id,
            "name": "Primary GC",
            "code": "GCD",
            "scope_description": "Divisions 1, 3-16: General Conditions and Construction",
        },
        {
            "building_id": building_id,
            "name": "Specialty GC",
            "code": "GCH",
            "scope_description": "Division 5+: Metals, Specialty Work",
        },
    ]

    created = []
    for data in defaults:
        contractor = Contractor(**data)
        db.add(contractor)
        created.append(contractor)

    db.commit()
    for contractor in created:
        db.refresh(contractor)
    return created
