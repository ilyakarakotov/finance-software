from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from typing import List

from app.database import get_db
from app.models.project import Project
from app.models.phase import Phase
from app.models.building import Building
from app.models.unit import Unit
from app.models.capital_stack import CapitalStackTranche
from app.models.promote_tier import PromoteTier
from app.schemas.project import (
    ProjectCreate, ProjectUpdate, ProjectResponse, ProjectDetailResponse,
    PhaseCreate, PhaseResponse,
    BuildingCreate, BuildingUpdate, BuildingResponse,
    UnitCreate, UnitUpdate, UnitResponse,
)

router = APIRouter(prefix="/projects", tags=["projects"])


@router.get("/", response_model=List[ProjectResponse])
def list_projects(db: Session = Depends(get_db)):
    return db.query(Project).all()


@router.post("/", response_model=ProjectResponse)
def create_project(data: ProjectCreate, db: Session = Depends(get_db)):
    project = Project(**data.model_dump())
    db.add(project)
    db.commit()
    db.refresh(project)
    return project


@router.get("/{project_id}", response_model=ProjectDetailResponse)
def get_project(project_id: int, db: Session = Depends(get_db)):
    project = (
        db.query(Project)
        .options(
            joinedload(Project.phases)
            .joinedload(Phase.buildings)
            .joinedload(Building.units)
        )
        .filter(Project.project_id == project_id)
        .first()
    )
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return project


@router.put("/{project_id}", response_model=ProjectResponse)
def update_project(project_id: int, data: ProjectUpdate, db: Session = Depends(get_db)):
    project = db.query(Project).filter(Project.project_id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(project, key, value)
    db.commit()
    db.refresh(project)
    return project


@router.delete("/{project_id}")
def delete_project(project_id: int, db: Session = Depends(get_db)):
    project = db.query(Project).filter(Project.project_id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    db.delete(project)
    db.commit()
    return {"detail": "Project deleted"}


@router.post("/{project_id}/initialize-capital")
def initialize_capital_stack(project_id: int, db: Session = Depends(get_db)):
    """Auto-create standard capital stack tranches and promote tiers from project defaults.
    Uses project-level financing defaults (from Excel proforma regular values) to create
    equity, senior debt, and promote tier entries — eliminating manual data entry."""
    project = db.query(Project).filter(Project.project_id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    gp_pct = float(project.gp_equity_pct or 0.59)
    lp_pct = 1.0 - gp_pct
    pref_rate = float(project.preferred_return_rate or 0.18)
    sr_rate = float(project.senior_debt_rate or 0.11)
    release = float(project.loan_release_pct or 1.15)
    land_orig = float(project.land_loan_origination_pct or 0.03)

    # Delete existing tranches and tiers
    db.query(CapitalStackTranche).filter(CapitalStackTranche.project_id == project_id).delete()
    db.query(PromoteTier).filter(PromoteTier.project_id == project_id).delete()
    db.flush()

    # Create equity tranche (amount set to 0, calculated by engine from residual)
    equity = CapitalStackTranche(
        project_id=project_id, type="equity",
        committed_amount=0, interest_rate=0, origination_fee_pct=0,
        gp_equity_pct=gp_pct, lp_equity_pct=lp_pct,
        preferred_return_rate=pref_rate, loan_release_pct=0,
    )
    db.add(equity)

    # Create senior debt tranche (amount set to 0, user enters or LTC derives)
    senior = CapitalStackTranche(
        project_id=project_id, type="senior",
        committed_amount=0, interest_rate=sr_rate, origination_fee_pct=0,
        gp_equity_pct=0, lp_equity_pct=0,
        preferred_return_rate=0, loan_release_pct=release,
    )
    db.add(senior)

    # Create land loan tranche (optional, amount=0)
    land = CapitalStackTranche(
        project_id=project_id, type="land_loan",
        committed_amount=0, interest_rate=sr_rate,
        origination_fee_pct=land_orig,
        gp_equity_pct=0, lp_equity_pct=0,
        preferred_return_rate=0, loan_release_pct=0,
    )
    db.add(land)

    # Create default promote tiers (matching Excel: 99.999% threshold, 18% XIRR)
    tier1 = PromoteTier(
        project_id=project_id, sequence=1,
        hurdle_rate=pref_rate, gp_split=gp_pct, lp_split=lp_pct,
    )
    db.add(tier1)

    db.commit()
    return {"detail": "Capital stack initialized with project defaults", "tranches": 3, "tiers": 1}


# ── Phases ──

@router.post("/{project_id}/phases", response_model=PhaseResponse)
def create_phase(project_id: int, data: PhaseCreate, db: Session = Depends(get_db)):
    phase = Phase(project_id=project_id, **data.model_dump())
    db.add(phase)
    db.commit()
    db.refresh(phase)
    return phase


@router.get("/{project_id}/phases", response_model=List[PhaseResponse])
def list_phases(project_id: int, db: Session = Depends(get_db)):
    return (
        db.query(Phase)
        .options(joinedload(Phase.buildings).joinedload(Building.units))
        .filter(Phase.project_id == project_id)
        .order_by(Phase.sequence)
        .all()
    )


@router.delete("/phases/{phase_id}")
def delete_phase(phase_id: int, db: Session = Depends(get_db)):
    phase = db.query(Phase).filter(Phase.phase_id == phase_id).first()
    if not phase:
        raise HTTPException(status_code=404, detail="Phase not found")
    db.delete(phase)
    db.commit()
    return {"detail": "Phase deleted"}


# ── Buildings ──

@router.post("/buildings", response_model=BuildingResponse)
def create_building(data: BuildingCreate, db: Session = Depends(get_db)):
    if data.sf_per_unit and data.unit_count:
        total_sf = data.sf_per_unit * data.unit_count
    else:
        total_sf = data.total_sf or 0
    building = Building(
        phase_id=data.phase_id,
        name=data.name,
        unit_count=data.unit_count,
        sf_per_unit=data.sf_per_unit,
        total_sf=total_sf,
        construction_start_month=data.construction_start_month,
        construction_duration=data.construction_duration,
    )
    db.add(building)
    db.commit()
    db.refresh(building)

    # Auto-generate units
    for i in range(1, data.unit_count + 1):
        unit = Unit(
            building_id=building.building_id,
            unit_number=f"{building.name}-{i}",
            sf=data.sf_per_unit,
            status="available",
        )
        db.add(unit)
    db.commit()
    db.refresh(building)
    return building


@router.put("/buildings/{building_id}", response_model=BuildingResponse)
def update_building(building_id: int, data: BuildingUpdate, db: Session = Depends(get_db)):
    building = db.query(Building).filter(Building.building_id == building_id).first()
    if not building:
        raise HTTPException(status_code=404, detail="Building not found")
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(building, key, value)
    if data.sf_per_unit is not None or data.unit_count is not None:
        sf = data.sf_per_unit if data.sf_per_unit is not None else building.sf_per_unit
        uc = data.unit_count if data.unit_count is not None else building.unit_count
        if sf and uc:
            building.total_sf = sf * uc
    db.commit()
    db.refresh(building)
    return building


@router.delete("/buildings/{building_id}")
def delete_building(building_id: int, db: Session = Depends(get_db)):
    building = db.query(Building).filter(Building.building_id == building_id).first()
    if not building:
        raise HTTPException(status_code=404, detail="Building not found")
    db.delete(building)
    db.commit()
    return {"detail": "Building deleted"}


# ── Units ──

@router.get("/{project_id}/units", response_model=List[UnitResponse])
def list_units(project_id: int, db: Session = Depends(get_db)):
    return (
        db.query(Unit)
        .join(Building)
        .join(Phase)
        .filter(Phase.project_id == project_id)
        .all()
    )


@router.put("/units/{unit_id}", response_model=UnitResponse)
def update_unit(unit_id: int, data: UnitUpdate, db: Session = Depends(get_db)):
    unit = db.query(Unit).filter(Unit.unit_id == unit_id).first()
    if not unit:
        raise HTTPException(status_code=404, detail="Unit not found")
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(unit, key, value)
    db.commit()
    db.refresh(unit)
    return unit


@router.put("/{project_id}/units/bulk", response_model=List[UnitResponse])
def bulk_update_units(project_id: int, updates: List[dict], db: Session = Depends(get_db)):
    updated = []
    for u in updates:
        unit_id = u.pop("unit_id", None)
        if not unit_id:
            continue
        unit = db.query(Unit).filter(Unit.unit_id == unit_id).first()
        if unit:
            for key, value in u.items():
                setattr(unit, key, value)
            updated.append(unit)
    db.commit()
    for unit in updated:
        db.refresh(unit)
    return updated
