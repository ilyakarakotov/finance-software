from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app.models.capital_stack import CapitalStackTranche
from app.models.promote_tier import PromoteTier
from app.schemas.capital import (
    CapitalStackTrancheCreate, CapitalStackTrancheUpdate, CapitalStackTrancheResponse,
    PromoteTierCreate, PromoteTierUpdate, PromoteTierResponse,
)

router = APIRouter(prefix="/capital", tags=["capital"])


# ── Tranches ──

@router.get("/{project_id}/tranches", response_model=List[CapitalStackTrancheResponse])
def list_tranches(project_id: int, db: Session = Depends(get_db)):
    return (
        db.query(CapitalStackTranche)
        .filter(CapitalStackTranche.project_id == project_id)
        .all()
    )


@router.post("/tranches", response_model=CapitalStackTrancheResponse)
def create_tranche(data: CapitalStackTrancheCreate, db: Session = Depends(get_db)):
    tranche = CapitalStackTranche(**data.model_dump())
    db.add(tranche)
    db.commit()
    db.refresh(tranche)
    return tranche


@router.post("/tranches/bulk", response_model=List[CapitalStackTrancheResponse])
def bulk_create_tranches(items: List[CapitalStackTrancheCreate], db: Session = Depends(get_db)):
    created = []
    for data in items:
        tranche = CapitalStackTranche(**data.model_dump())
        db.add(tranche)
        created.append(tranche)
    db.commit()
    for t in created:
        db.refresh(t)
    return created


@router.put("/tranches/{tranche_id}", response_model=CapitalStackTrancheResponse)
def update_tranche(tranche_id: int, data: CapitalStackTrancheUpdate, db: Session = Depends(get_db)):
    tranche = db.query(CapitalStackTranche).filter(CapitalStackTranche.tranche_id == tranche_id).first()
    if not tranche:
        raise HTTPException(status_code=404, detail="Tranche not found")
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(tranche, key, value)
    db.commit()
    db.refresh(tranche)
    return tranche


@router.delete("/tranches/{tranche_id}")
def delete_tranche(tranche_id: int, db: Session = Depends(get_db)):
    tranche = db.query(CapitalStackTranche).filter(CapitalStackTranche.tranche_id == tranche_id).first()
    if not tranche:
        raise HTTPException(status_code=404, detail="Tranche not found")
    db.delete(tranche)
    db.commit()
    return {"detail": "Tranche deleted"}


# ── Promote Tiers ──

@router.get("/{project_id}/promote-tiers", response_model=List[PromoteTierResponse])
def list_promote_tiers(project_id: int, db: Session = Depends(get_db)):
    return (
        db.query(PromoteTier)
        .filter(PromoteTier.project_id == project_id)
        .order_by(PromoteTier.sequence)
        .all()
    )


@router.post("/promote-tiers", response_model=PromoteTierResponse)
def create_promote_tier(data: PromoteTierCreate, db: Session = Depends(get_db)):
    tier = PromoteTier(**data.model_dump())
    db.add(tier)
    db.commit()
    db.refresh(tier)
    return tier


@router.post("/promote-tiers/bulk", response_model=List[PromoteTierResponse])
def bulk_create_promote_tiers(items: List[PromoteTierCreate], db: Session = Depends(get_db)):
    created = []
    for data in items:
        tier = PromoteTier(**data.model_dump())
        db.add(tier)
        created.append(tier)
    db.commit()
    for t in created:
        db.refresh(t)
    return created


@router.put("/promote-tiers/{tier_id}", response_model=PromoteTierResponse)
def update_promote_tier(tier_id: int, data: PromoteTierUpdate, db: Session = Depends(get_db)):
    tier = db.query(PromoteTier).filter(PromoteTier.tier_id == tier_id).first()
    if not tier:
        raise HTTPException(status_code=404, detail="Promote tier not found")
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(tier, key, value)
    db.commit()
    db.refresh(tier)
    return tier


@router.delete("/promote-tiers/{tier_id}")
def delete_promote_tier(tier_id: int, db: Session = Depends(get_db)):
    tier = db.query(PromoteTier).filter(PromoteTier.tier_id == tier_id).first()
    if not tier:
        raise HTTPException(status_code=404, detail="Promote tier not found")
    db.delete(tier)
    db.commit()
    return {"detail": "Promote tier deleted"}
