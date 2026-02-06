from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional
from datetime import datetime

from app.database import get_db
from app.models.project import Project
from app.models.phase import Phase
from app.models.building import Building
from app.models.unit import Unit
from app.models.budget_line_item import BudgetLineItem
from app.models.capital_stack import CapitalStackTranche
from app.models.promote_tier import PromoteTier
from app.models.monthly_cashflow import MonthlyCashflow
from app.schemas.cashflow import (
    MonthlyCashflowResponse, ProjectMetricsResponse, RecalcResponse,
    WaterfallResponse, SensitivityGridResponse, SensitivityCell,
    PriceSolverRequest, PriceSolverResponse, BuildingPriceSuggestion,
    PricingAnalysisResponse,
)
from app.engine.calc_engine import (
    run_calc_engine, LineItemInput, UnitInput, TrancheInput, PromoteTierInput,
)

router = APIRouter(prefix="/cashflow", tags=["cashflow"])

TOTAL_MONTHS = 72


# ── Shared helpers ──

def _load_project_inputs(project_id: int, db: Session):
    project = db.query(Project).filter(Project.project_id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    line_items = [
        LineItemInput(
            line_item_id=li.line_item_id, category=li.category,
            budget_amount=float(li.budget_amount or 0),
            forecast_method=li.forecast_method or "s_curve",
            start_month=li.start_month or 0,
            duration_months=li.duration_months or 12,
            s_curve_steepness=li.s_curve_steepness or 5,
        )
        for li in db.query(BudgetLineItem).filter(BudgetLineItem.project_id == project_id).all()
    ]

    units = [
        UnitInput(unit_id=u.unit_id, sf=u.sf or 0,
                  sale_price=float(u.sale_price or 0), sale_month=u.sale_month)
        for u in db.query(Unit).join(Building).join(Phase).filter(Phase.project_id == project_id).all()
    ]

    tranches = [
        TrancheInput(
            tranche_id=t.tranche_id, type=t.type,
            committed_amount=float(t.committed_amount or 0),
            interest_rate=float(t.interest_rate or 0),
            origination_fee_pct=float(t.origination_fee_pct or 0),
            gp_equity_pct=float(t.gp_equity_pct or 0),
            lp_equity_pct=float(t.lp_equity_pct or 0),
            preferred_return_rate=float(t.preferred_return_rate or 0),
            loan_release_pct=float(t.loan_release_pct or 0),
        )
        for t in db.query(CapitalStackTranche).filter(CapitalStackTranche.project_id == project_id).all()
    ]

    promote_tiers = [
        PromoteTierInput(
            sequence=pt.sequence, hurdle_rate=float(pt.hurdle_rate or 0),
            gp_split=float(pt.gp_split or 0), lp_split=float(pt.lp_split or 0),
        )
        for pt in db.query(PromoteTier).filter(PromoteTier.project_id == project_id).order_by(PromoteTier.sequence).all()
    ]

    return project, line_items, units, tranches, promote_tiers


def _project_calc_params(project, units):
    return {
        "start_date": project.start_date or datetime(2024, 1, 1),
        "total_months": TOTAL_MONTHS,
        "total_units": project.total_units or len(units),
        "cost_of_sale_pct": float(project.cost_of_sale_pct or 0.065),
    }


def _row_to_cf_response(row, project_id) -> MonthlyCashflowResponse:
    """Convert a MonthlyCashflowRow (engine output) to API response."""
    return MonthlyCashflowResponse(
        project_id=project_id,
        month_number=row.month_number,
        calendar_date=row.calendar_date,
        construction_cost=row.construction_cost,
        contingency=row.contingency,
        horizontal=row.horizontal,
        soft_costs=row.soft_costs,
        gc_fee=row.gc_fee,
        land=row.land,
        other=row.other,
        total_development_cost=row.total_development_cost,
        cumulative_development_cost=row.cumulative_development_cost,
        equity_draw=row.equity_draw,
        senior_draw=row.senior_draw,
        senior_balance=row.senior_balance,
        senior_interest=row.senior_interest,
        mezz_draw=row.mezz_draw,
        mezz_balance=row.mezz_balance,
        mezz_interest=row.mezz_interest,
        land_loan_draw=row.land_loan_draw,
        land_loan_balance=row.land_loan_balance,
        gross_sales=row.gross_sales,
        cost_of_sale=row.cost_of_sale,
        net_sales=row.net_sales,
        loan_payoff_from_sales=row.loan_payoff_from_sales,
        free_cashflow=row.free_cashflow,
        cumulative_cashflow=row.cumulative_cashflow,
    )


def _db_cf_to_response(cf) -> MonthlyCashflowResponse:
    """Convert a MonthlyCashflow DB row to API response."""
    return MonthlyCashflowResponse(
        cf_id=cf.cf_id, project_id=cf.project_id,
        month_number=cf.month_number, calendar_date=cf.calendar_date,
        construction_cost=float(cf.construction_cost or 0),
        contingency=float(cf.contingency or 0),
        horizontal=float(cf.horizontal or 0),
        soft_costs=float(cf.soft_costs or 0),
        gc_fee=float(cf.gc_fee or 0),
        land=float(cf.land or 0),
        other=float(cf.other or 0),
        total_development_cost=float(cf.total_development_cost or 0),
        cumulative_development_cost=float(cf.cumulative_development_cost or 0),
        equity_draw=float(cf.equity_draw or 0),
        senior_draw=float(cf.senior_draw or 0),
        senior_balance=float(cf.senior_balance or 0),
        senior_interest=float(cf.senior_interest or 0),
        mezz_draw=float(cf.mezz_draw or 0),
        mezz_balance=float(cf.mezz_balance or 0),
        mezz_interest=float(cf.mezz_interest or 0),
        land_loan_draw=float(cf.land_loan_draw or 0),
        land_loan_balance=float(cf.land_loan_balance or 0),
        gross_sales=float(cf.gross_sales or 0),
        cost_of_sale=float(cf.cost_of_sale or 0),
        net_sales=float(cf.net_sales or 0),
        loan_payoff_from_sales=float(cf.loan_payoff_from_sales or 0),
        free_cashflow=float(cf.free_cashflow or 0),
        cumulative_cashflow=float(cf.cumulative_cashflow or 0),
    )


def _build_metrics_response(metrics) -> ProjectMetricsResponse:
    wf_resp = None
    if metrics.waterfall:
        wf = metrics.waterfall
        wf_resp = WaterfallResponse(
            gp_return_of_capital=wf.gp_return_of_capital,
            lp_return_of_capital=wf.lp_return_of_capital,
            gp_preferred_return=wf.gp_preferred_return,
            lp_preferred_return=wf.lp_preferred_return,
            gp_promote_by_tier={str(k): v for k, v in wf.gp_promote_by_tier.items()},
            lp_promote_by_tier={str(k): v for k, v in wf.lp_promote_by_tier.items()},
            total_gp=wf.total_gp, total_lp=wf.total_lp,
            gp_multiple=wf.gp_multiple, lp_multiple=wf.lp_multiple,
        )
    return ProjectMetricsResponse(
        total_development_cost=metrics.total_development_cost,
        total_with_financing=metrics.total_with_financing,
        total_revenue=metrics.total_revenue,
        total_cost_of_sale=metrics.total_cost_of_sale,
        senior_debt_committed=metrics.senior_debt_committed,
        total_equity=metrics.total_equity,
        gp_equity=metrics.gp_equity, lp_equity=metrics.lp_equity,
        senior_interest=metrics.senior_interest,
        project_profit=metrics.project_profit_val,
        profit_margin=metrics.profit_margin_val,
        levered_xirr=metrics.levered_xirr,
        unlevered_xirr=metrics.unlevered_xirr,
        equity_multiple=metrics.equity_multiple_val,
        gp_xirr=metrics.gp_xirr, lp_xirr=metrics.lp_xirr,
        gp_multiple=metrics.gp_multiple, lp_multiple=metrics.lp_multiple,
        ltc_ratio=metrics.ltc_ratio, peak_equity=metrics.peak_equity,
        peak_debt_balance=metrics.peak_debt_balance,
        total_financing_cost=metrics.total_financing_cost,
        waterfall=wf_resp,
    )


def _run_scenario(params, line_items, units, tranches, promote_tiers,
                  sale_mult=1.0, cost_mult=1.0):
    """Run calc engine with adjusted sale prices and construction costs."""
    adj_units = [
        UnitInput(unit_id=u.unit_id, sf=u.sf,
                  sale_price=float(u.sale_price or 0) * sale_mult,
                  sale_month=u.sale_month)
        for u in units
    ] if sale_mult != 1.0 else units

    adj_items = line_items
    if cost_mult != 1.0:
        adj_items = [
            LineItemInput(
                line_item_id=li.line_item_id, category=li.category,
                budget_amount=li.budget_amount * (cost_mult if li.category == "construction" else 1.0),
                forecast_method=li.forecast_method, start_month=li.start_month,
                duration_months=li.duration_months, s_curve_steepness=li.s_curve_steepness,
            )
            for li in line_items
        ]

    # Tranches need fresh copies (TrancheInput is immutable, but TrancheState is stateful)
    fresh_tranches = [
        TrancheInput(
            tranche_id=t.tranche_id, type=t.type,
            committed_amount=t.committed_amount, interest_rate=t.interest_rate,
            origination_fee_pct=t.origination_fee_pct,
            gp_equity_pct=t.gp_equity_pct, lp_equity_pct=t.lp_equity_pct,
            preferred_return_rate=t.preferred_return_rate,
            loan_release_pct=t.loan_release_pct,
        )
        for t in tranches
    ]

    return run_calc_engine(
        start_date=params["start_date"], total_months=params["total_months"],
        total_units=params["total_units"], cost_of_sale_pct=params["cost_of_sale_pct"],
        line_items=adj_items, units=adj_units,
        tranches=fresh_tranches, promote_tiers=promote_tiers,
    )


# ── Endpoints ──

@router.post("/{project_id}/recalc", response_model=RecalcResponse)
def recalculate(project_id: int, db: Session = Depends(get_db)):
    project, line_items, units, tranches, promote_tiers = _load_project_inputs(project_id, db)
    params = _project_calc_params(project, units)

    result = run_calc_engine(
        **params, line_items=line_items, units=units,
        tranches=tranches, promote_tiers=promote_tiers,
    )

    # Store cashflows
    db.query(MonthlyCashflow).filter(MonthlyCashflow.project_id == project_id).delete()
    for row in result.cashflows:
        cf = MonthlyCashflow(
            project_id=project_id, month_number=row.month_number,
            calendar_date=row.calendar_date,
            construction_cost=row.construction_cost, contingency=row.contingency,
            horizontal=row.horizontal, soft_costs=row.soft_costs,
            gc_fee=row.gc_fee, land=row.land, other=row.other,
            total_development_cost=row.total_development_cost,
            cumulative_development_cost=row.cumulative_development_cost,
            equity_draw=row.equity_draw, senior_draw=row.senior_draw,
            senior_balance=row.senior_balance, senior_interest=row.senior_interest,
            mezz_draw=row.mezz_draw, mezz_balance=row.mezz_balance,
            mezz_interest=row.mezz_interest,
            land_loan_draw=row.land_loan_draw, land_loan_balance=row.land_loan_balance,
            gross_sales=row.gross_sales, cost_of_sale=row.cost_of_sale,
            net_sales=row.net_sales, loan_payoff_from_sales=row.loan_payoff_from_sales,
            free_cashflow=row.free_cashflow, cumulative_cashflow=row.cumulative_cashflow,
        )
        db.add(cf)
    db.commit()

    return RecalcResponse(
        cashflows=[_row_to_cf_response(row, project_id) for row in result.cashflows],
        metrics=_build_metrics_response(result.metrics),
    )


@router.get("/{project_id}", response_model=List[MonthlyCashflowResponse])
def get_cashflows(project_id: int, db: Session = Depends(get_db)):
    cashflows = (
        db.query(MonthlyCashflow)
        .filter(MonthlyCashflow.project_id == project_id)
        .order_by(MonthlyCashflow.month_number).all()
    )
    return [_db_cf_to_response(cf) for cf in cashflows]


@router.get("/{project_id}/metrics", response_model=ProjectMetricsResponse)
def get_metrics(project_id: int, db: Session = Depends(get_db)):
    """Get metrics — recalculates fresh each time for accuracy."""
    project, line_items, units, tranches, promote_tiers = _load_project_inputs(project_id, db)
    params = _project_calc_params(project, units)
    result = run_calc_engine(
        **params, line_items=line_items, units=units,
        tranches=tranches, promote_tiers=promote_tiers,
    )
    return _build_metrics_response(result.metrics)


@router.get("/{project_id}/sensitivity", response_model=SensitivityGridResponse)
def sensitivity_analysis(project_id: int, db: Session = Depends(get_db)):
    project, line_items, units, tranches, promote_tiers = _load_project_inputs(project_id, db)
    params = _project_calc_params(project, units)
    total_sf = project.total_sf or 1

    base_revenue = sum(float(u.sale_price or 0) for u in units)
    base_sale_psf = base_revenue / total_sf if total_sf > 0 else 0
    base_construction = sum(li.budget_amount for li in line_items if li.category == "construction")
    base_cost_psf = base_construction / total_sf if total_sf > 0 else 0

    multipliers = [0.8, 0.9, 1.0, 1.1, 1.2]
    sale_psf_values = [base_sale_psf * m for m in multipliers]
    cost_psf_values = [base_cost_psf * m for m in multipliers]

    cells = []
    for sale_mult in multipliers:
        row = []
        for cost_mult in multipliers:
            result = _run_scenario(params, line_items, units, tranches, promote_tiers,
                                   sale_mult=sale_mult, cost_mult=cost_mult)
            row.append(SensitivityCell(
                sale_price_psf=base_sale_psf * sale_mult,
                construction_cost_psf=base_cost_psf * cost_mult,
                project_profit=result.metrics.project_profit_val,
                xirr=result.metrics.levered_xirr,
            ))
        cells.append(row)

    return SensitivityGridResponse(
        sale_price_psf_values=sale_psf_values,
        construction_cost_psf_values=cost_psf_values,
        cells=cells,
    )


@router.get("/{project_id}/pricing-analysis", response_model=PricingAnalysisResponse)
def pricing_analysis(project_id: int, db: Session = Depends(get_db)):
    project, line_items, units, tranches, promote_tiers = _load_project_inputs(project_id, db)
    params = _project_calc_params(project, units)
    total_sf = project.total_sf or 1
    cost_of_sale_pct = params["cost_of_sale_pct"]

    result = run_calc_engine(
        **params, line_items=line_items, units=units,
        tranches=tranches, promote_tiers=promote_tiers,
    )
    m = result.metrics

    current_avg_psf = m.total_revenue / total_sf if total_sf > 0 else 0
    break_even_psf = (m.total_with_financing / total_sf) / (1 - cost_of_sale_pct) if total_sf > 0 else 0
    margin_above = (current_avg_psf - break_even_psf) / break_even_psf if break_even_psf > 0 else 0
    psf_20 = (m.total_with_financing / total_sf) / (1 - 0.20 - cost_of_sale_pct) if total_sf > 0 else 0

    if m.total_equity > 0 and total_sf > 0:
        required_profit_3x = m.total_equity * 2.0  # 3x multiple means 2x profit
        rev_3x = (m.total_with_financing + required_profit_3x) / (1 - cost_of_sale_pct)
        psf_3x = rev_3x / total_sf
    else:
        psf_3x = 0

    return PricingAnalysisResponse(
        break_even_psf=round(break_even_psf, 2),
        current_avg_psf=round(current_avg_psf, 2),
        margin_above_break_even=round(margin_above, 4),
        psf_for_20pct_margin=round(psf_20, 2),
        psf_for_3x_multiple=round(psf_3x, 2),
    )


@router.post("/{project_id}/solve-price", response_model=PriceSolverResponse)
def solve_price(project_id: int, req: PriceSolverRequest, db: Session = Depends(get_db)):
    project, line_items, units, tranches, promote_tiers = _load_project_inputs(project_id, db)
    params = _project_calc_params(project, units)
    total_sf = project.total_sf or 1
    cost_of_sale_pct = params["cost_of_sale_pct"]

    buildings_db = (
        db.query(Building).join(Phase).filter(Phase.project_id == project_id).all()
    )

    base_result = run_calc_engine(
        **params, line_items=line_items, units=units,
        tranches=tranches, promote_tiers=promote_tiers,
    )
    bm = base_result.metrics
    break_even_psf = (bm.total_with_financing / total_sf) / (1 - cost_of_sale_pct) if total_sf > 0 else 0

    required_avg_psf = 0.0
    target_revenue = 0.0

    if req.target_metric == "profit_margin":
        target_revenue = bm.total_with_financing / (1 - req.target_value - cost_of_sale_pct)
        required_avg_psf = target_revenue / total_sf if total_sf > 0 else 0

    elif req.target_metric == "equity_multiple":
        if bm.total_equity > 0:
            required_profit = bm.total_equity * req.target_value - bm.total_equity
            target_revenue = (bm.total_with_financing + required_profit) / (1 - cost_of_sale_pct)
            required_avg_psf = target_revenue / total_sf if total_sf > 0 else 0

    elif req.target_metric == "levered_irr":
        low_psf, high_psf = break_even_psf * 0.5, break_even_psf * 3.0
        best_psf = break_even_psf
        for _ in range(20):
            mid_psf = (low_psf + high_psf) / 2
            adjusted_units = [
                UnitInput(unit_id=u.unit_id, sf=u.sf,
                          sale_price=max(round(mid_psf * (u.sf or 0) / 10000) * 10000, 0),
                          sale_month=u.sale_month)
                for u in units
            ]
            try:
                r = run_calc_engine(
                    **params, line_items=line_items, units=adjusted_units,
                    tranches=[TrancheInput(
                        tranche_id=t.tranche_id, type=t.type,
                        committed_amount=t.committed_amount, interest_rate=t.interest_rate,
                        origination_fee_pct=t.origination_fee_pct,
                        gp_equity_pct=t.gp_equity_pct, lp_equity_pct=t.lp_equity_pct,
                        preferred_return_rate=t.preferred_return_rate,
                        loan_release_pct=t.loan_release_pct,
                    ) for t in tranches],
                    promote_tiers=promote_tiers,
                )
                irr = r.metrics.levered_xirr
                if irr is None:
                    low_psf = mid_psf
                    continue
                if abs(irr - req.target_value) < 0.001:
                    best_psf = mid_psf
                    break
                if irr < req.target_value:
                    low_psf = mid_psf
                else:
                    high_psf = mid_psf
                best_psf = mid_psf
            except Exception:
                low_psf = mid_psf
        required_avg_psf = best_psf
        target_revenue = required_avg_psf * total_sf

    # Distribute across buildings
    suggestions = []
    current_total_revenue = sum(float(u.sale_price or 0) for u in units)
    for bldg in buildings_db:
        bldg_sf = (bldg.sf_per_unit or 0) * (bldg.unit_count or 0)
        if req.distribution_mode == "proportional" and current_total_revenue > 0 and total_sf > 0:
            bldg_unit_ids = {u.unit_id for u in (bldg.units or [])}
            bldg_revenue = sum(float(u.sale_price or 0) for u in units if u.unit_id in bldg_unit_ids)
            current_bldg_psf = bldg_revenue / bldg_sf if bldg_sf > 0 else 0
            current_weighted_avg = current_total_revenue / total_sf
            multiplier = required_avg_psf / current_weighted_avg if current_weighted_avg > 0 else 1
            suggested_psf = current_bldg_psf * multiplier
        else:
            suggested_psf = required_avg_psf
        suggestions.append(BuildingPriceSuggestion(
            building_id=bldg.building_id, building_name=bldg.name,
            suggested_psf=round(suggested_psf, 2),
            unit_count=bldg.unit_count or 0, total_sf=bldg_sf,
        ))

    return PriceSolverResponse(
        required_avg_psf=round(required_avg_psf, 2),
        break_even_psf=round(break_even_psf, 2),
        target_revenue=round(target_revenue, 2),
        building_suggestions=suggestions,
    )
