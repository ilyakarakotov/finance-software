"""
Seed the local SQLite database with Lowell Heights proforma data
from lowell-heights-seed-data.json.
"""
import json
import os
import sys
from datetime import datetime

sys.path.insert(0, os.path.dirname(__file__))

from app.database import engine, Base, SessionLocal
from app.models.project import Project
from app.models.phase import Phase
from app.models.building import Building
from app.models.unit import Unit
from app.models.budget_line_item import BudgetLineItem
from app.models.capital_stack import CapitalStackTranche
from app.models.promote_tier import PromoteTier
from app.models.monthly_cashflow import MonthlyCashflow
from app.models.contractor import Contractor
from app.models.loan_draw import LoanDraw

# ── Load seed JSON ──────────────────────────────────────────────────
seed_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "lowell-heights-seed-data.json")
with open(seed_path, "r") as f:
    data = json.load(f)

# ── Reset DB ────────────────────────────────────────────────────────
Base.metadata.drop_all(bind=engine)
Base.metadata.create_all(bind=engine)
print("Database tables recreated.")

db = SessionLocal()

try:
    # ── 1. Project ──────────────────────────────────────────────────
    p = data["project"]
    project = Project(
        name=p["name"],
        address=p["address"],
        lot_size_acres=p["lot_size_acres"],
        start_date=datetime.strptime(p["start_date"], "%Y-%m-%d"),
        total_units=p["total_units"],
        total_sf=p["total_sf"],
        cost_of_sale_pct=p["cost_of_sale_pct"],
        gc_fee_pct=p["gc_fee_pct"],
        contingency_pct=p["contingency_pct"],
        soft_costs_pct=0.12,
        sales_tax_rate=0.0,
        construction_cost_psf=146.326086128622,
        gp_equity_pct=0.59,
        preferred_return_rate=0.18,
        senior_debt_rate=0.11,
        loan_release_pct=1.15,
        land_loan_origination_pct=0.03,
    )
    db.add(project)
    db.flush()
    project_id = project.project_id
    print(f"Created project: {project.name} (id={project_id})")

    # ── 2. Phases ───────────────────────────────────────────────────
    phase_map = {}  # phase number -> Phase object
    for ph in data["phases"]:
        phase = Phase(
            project_id=project_id,
            name=ph["name"],
            start_month=0,
            sequence=ph["number"],
        )
        db.add(phase)
        db.flush()
        phase_map[ph["number"]] = phase
        print(f"  Phase: {phase.name} (id={phase.phase_id})")

    # ── 3. Buildings ────────────────────────────────────────────────
    building_map = {}  # building name -> Building object
    for b in data["buildings"]:
        phase_obj = phase_map[b["phase"]]
        # Construction timing from seed data (defaults if not present)
        timing = b.get("construction_start_month", 1)
        duration = b.get("construction_duration", 6)
        building = Building(
            phase_id=phase_obj.phase_id,
            name=f"Building {b['name']}",
            unit_count=b["unit_count"],
            sf_per_unit=b["sf_per_unit"],
            total_sf=b["unit_count"] * b["sf_per_unit"],
            construction_start_month=timing,
            construction_duration=duration,
        )
        db.add(building)
        db.flush()

        # Update with new SF fields and project info
        building.gross_sf = building.total_sf or (building.sf_per_unit or 0) * building.unit_count
        building.far_sf = int(building.gross_sf * 0.88) if building.gross_sf else 0
        building.garage_sf = int(building.gross_sf * 0.15) if building.gross_sf else 0
        building.price_range = 950000
        building.project_type = "TH"

        building_map[b["name"]] = building
        print(f"    Building {b['name']}: {b['unit_count']} units × {b['sf_per_unit']} SF (id={building.building_id})")

    # ── 4. Units ────────────────────────────────────────────────────
    for u in data["units"]:
        building_obj = building_map[u["building"]]
        sf = u["sf"]
        price = u["price"]
        psf = round(price / sf, 2) if sf > 0 else 0
        unit = Unit(
            building_id=building_obj.building_id,
            unit_number=str(u["unit"]),
            sf=sf,
            sale_price=price,
            sale_month=u["sale_month"],
            price_per_sf=psf,
            status="available",
        )
        db.add(unit)
    db.flush()
    print(f"  Created {len(data['units'])} units")

    # ── 4b. Contractors (for Building A) ──────────────────────────
    building_a = building_map.get("A")
    if building_a:
        gc_site = Contractor(
            building_id=building_a.building_id,
            name="Site GC",
            code="GCX",
            scope_description="Division 2: Site Construction"
        )
        gc_primary = Contractor(
            building_id=building_a.building_id,
            name="Primary GC",
            code="GCD",
            scope_description="Divisions 1, 3-16: General Conditions and Construction"
        )
        gc_specialty = Contractor(
            building_id=building_a.building_id,
            name="Specialty GC",
            code="GCH",
            scope_description="Division 5+: Metals, Specialty Work"
        )
        db.add_all([gc_site, gc_primary, gc_specialty])
        db.flush()
        print(f"  Created 3 contractors for Building A")

    # ── 5. Budget Line Items ────────────────────────────────────────
    for li in data["budget_line_items"]:
        building_id = None
        if "building" in li:
            building_id = building_map[li["building"]].building_id

        method = li["method"]
        if method == "lump_sum":
            method = "s_curve"  # treat lump_sum as s_curve with duration 1

        item = BudgetLineItem(
            project_id=project_id,
            building_id=building_id,
            category=li["category"],
            description=li["description"],
            budget_amount=li["amount"],
            forecast_method=method,
            start_month=li.get("start_month", 0),
            duration_months=li.get("duration", 1),
            s_curve_steepness=li.get("steepness", 5),
        )
        db.add(item)
    db.flush()
    print(f"  Created {len(data['budget_line_items'])} budget line items")

    # ── 6. Capital Stack Tranches ───────────────────────────────────
    cs = data["capital_stack"]

    # Equity tranche
    equity = CapitalStackTranche(
        project_id=project_id,
        type="equity",
        committed_amount=cs["equity"]["total_committed"],
        interest_rate=0,
        origination_fee_pct=0,
        gp_equity_pct=cs["equity"]["gp_pct"],
        lp_equity_pct=cs["equity"]["lp_pct"],
        preferred_return_rate=0.18,
        loan_release_pct=0,
    )
    db.add(equity)

    # Senior debt tranche
    senior = CapitalStackTranche(
        project_id=project_id,
        type="senior",
        committed_amount=cs["senior_debt"]["committed"],
        interest_rate=cs["senior_debt"]["interest_rate"],
        origination_fee_pct=cs["senior_debt"]["origination_fee_pct"],
        gp_equity_pct=0,
        lp_equity_pct=0,
        preferred_return_rate=0,
        loan_release_pct=cs["senior_debt"]["loan_release_pct"],
    )
    db.add(senior)

    # Mezz debt tranche (zero but included for completeness)
    mezz = CapitalStackTranche(
        project_id=project_id,
        type="mezz",
        committed_amount=cs["mezz_debt"]["committed"],
        interest_rate=cs["mezz_debt"]["interest_rate"],
        origination_fee_pct=0,
        gp_equity_pct=0,
        lp_equity_pct=0,
        preferred_return_rate=0,
        loan_release_pct=0,
    )
    db.add(mezz)

    # Land loan tranche (zero but included for completeness)
    land = CapitalStackTranche(
        project_id=project_id,
        type="land_loan",
        committed_amount=cs["land_loan"]["committed"],
        interest_rate=cs["land_loan"]["interest_rate"],
        origination_fee_pct=0,
        gp_equity_pct=0,
        lp_equity_pct=0,
        preferred_return_rate=0,
        loan_release_pct=0,
    )
    db.add(land)
    db.flush()
    print("  Created 4 capital stack tranches (equity, senior, mezz, land_loan)")

    # ── 7. Promote Tiers ────────────────────────────────────────────
    ps = data["promote_structure"]

    # Tier 0: Preferred return
    pref = PromoteTier(
        project_id=project_id,
        sequence=0,
        hurdle_rate=ps["preferred_return"]["rate"],
        gp_split=ps["preferred_return"]["gp_split"],
        lp_split=ps["preferred_return"]["lp_split"],
    )
    db.add(pref)

    # Tier 1: GP catch-up
    t1 = PromoteTier(
        project_id=project_id,
        sequence=1,
        hurdle_rate=ps["tier_1"]["hurdle"],
        gp_split=ps["tier_1"]["gp_split"],
        lp_split=ps["tier_1"]["lp_split"],
    )
    db.add(t1)

    # Tier 2
    t2 = PromoteTier(
        project_id=project_id,
        sequence=2,
        hurdle_rate=ps["tier_2"]["hurdle"],
        gp_split=ps["tier_2"]["gp_split"],
        lp_split=ps["tier_2"]["lp_split"],
    )
    db.add(t2)
    db.flush()
    print("  Created 3 promote tiers (preferred, tier 1 GP catch-up, tier 2)")

    # ── Commit ──────────────────────────────────────────────────────
    db.commit()
    print("\n✓ Seed data committed successfully!")
    print(f"  Project ID: {project_id}")
    print(f"  Phases: {len(phase_map)}")
    print(f"  Buildings: {len(building_map)}")
    print(f"  Units: {len(data['units'])}")
    print(f"  Budget items: {len(data['budget_line_items'])}")
    print(f"  Capital tranches: 4")
    print(f"  Promote tiers: 3")

except Exception as e:
    db.rollback()
    print(f"\n✗ Seed failed: {e}")
    raise
finally:
    db.close()
