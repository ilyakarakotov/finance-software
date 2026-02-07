"""
DAG-based calculation engine for the Greencity Development Finance Platform.
Computes the full monthly cashflow timeline from project inputs.
"""
from typing import List, Dict, Optional, Tuple
from datetime import datetime
from dateutil.relativedelta import relativedelta
from dataclasses import dataclass
import numpy as np

from app.engine.s_curve import s_curve_distribution, straight_line_distribution
from app.engine.financing import TrancheState, compute_monthly_financing
from app.engine.waterfall import PromoteTierDef, WaterfallResult, compute_waterfall
from app.engine.returns import xirr, equity_multiple, project_profit, profit_margin


@dataclass
class LineItemInput:
    line_item_id: int
    category: str
    budget_amount: float
    forecast_method: str
    start_month: int
    duration_months: int
    s_curve_steepness: int = 5
    division_code: Optional[str] = None  # New: CSI division code for hierarchical budgets


@dataclass
class UnitInput:
    unit_id: int
    sf: int
    sale_price: float
    sale_month: Optional[int] = None


@dataclass
class TrancheInput:
    tranche_id: int
    type: str
    committed_amount: float
    interest_rate: float
    origination_fee_pct: float
    gp_equity_pct: float
    lp_equity_pct: float
    preferred_return_rate: float
    loan_release_pct: float


@dataclass
class PromoteTierInput:
    sequence: int
    hurdle_rate: float
    gp_split: float
    lp_split: float


@dataclass
class MonthlyCashflowRow:
    month_number: int
    calendar_date: datetime
    construction_cost: float = 0.0
    contingency: float = 0.0
    horizontal: float = 0.0
    soft_costs: float = 0.0
    gc_fee: float = 0.0
    land: float = 0.0
    other: float = 0.0
    total_development_cost: float = 0.0
    cumulative_development_cost: float = 0.0
    equity_draw: float = 0.0
    senior_draw: float = 0.0
    senior_balance: float = 0.0
    senior_interest: float = 0.0
    mezz_draw: float = 0.0
    mezz_balance: float = 0.0
    mezz_interest: float = 0.0
    land_loan_draw: float = 0.0
    land_loan_balance: float = 0.0
    gross_sales: float = 0.0
    cost_of_sale: float = 0.0
    net_sales: float = 0.0
    loan_payoff_from_sales: float = 0.0
    free_cashflow: float = 0.0
    cumulative_cashflow: float = 0.0


@dataclass
class ProjectMetrics:
    total_development_cost: float = 0.0
    total_with_financing: float = 0.0
    total_revenue: float = 0.0
    total_cost_of_sale: float = 0.0
    senior_debt_committed: float = 0.0
    total_equity: float = 0.0
    gp_equity: float = 0.0
    lp_equity: float = 0.0
    senior_interest: float = 0.0
    project_profit_val: float = 0.0
    profit_margin_val: float = 0.0
    levered_xirr: Optional[float] = None
    unlevered_xirr: Optional[float] = None
    equity_multiple_val: Optional[float] = None
    gp_xirr: Optional[float] = None
    lp_xirr: Optional[float] = None
    gp_multiple: Optional[float] = None
    lp_multiple: Optional[float] = None
    ltc_ratio: Optional[float] = None
    peak_equity: float = 0.0
    peak_debt_balance: float = 0.0
    total_financing_cost: float = 0.0
    waterfall: Optional[WaterfallResult] = None


@dataclass
class CalcResult:
    cashflows: List[MonthlyCashflowRow]
    metrics: ProjectMetrics


CATEGORY_MAP = {
    "construction": "construction_cost",
    "contingency": "contingency",
    "horizontal": "horizontal",
    "soft_costs": "soft_costs",
    "gc_fee": "gc_fee",
    "land": "land",
    "other": "other",
}

# CSI Division-to-cashflow mapping (for new hierarchical budget system)
# Items with division_code use this mapping, items without use CATEGORY_MAP
DIVISION_MAP = {
    "01000": "soft_costs",          # General Conditions (pre-dev, admin, temp facilities)
    "02000": "horizontal",          # Site Construction (earthwork, utilities, drainage, landscaping)
    "03000": "construction_cost",   # Concrete
    "04000": "construction_cost",   # Masonry
    "05000": "construction_cost",   # Metals (structural framing, ornamental)
    "06000": "construction_cost",   # Wood, Plastics, Composites
    "07000": "construction_cost",   # Thermal & Moisture Protection
    "08000": "construction_cost",   # Openings (doors, windows)
    "09000": "construction_cost",   # Finishes (drywall, flooring, paint)
    "10000": "construction_cost",   # Specialties
    "11000": "construction_cost",   # Equipment
    "12000": "construction_cost",   # Furnishings
    "13000": "construction_cost",   # Special Construction
    "14000": "construction_cost",   # Conveying Equipment (elevators)
    "15000": "construction_cost",   # Mechanical (plumbing, HVAC)
    "16000": "construction_cost",   # Electrical
    "21000": "construction_cost",   # Fire Suppression
    "22000": "construction_cost",   # Plumbing
    "23000": "construction_cost",   # HVAC
    "26000": "construction_cost",   # Electrical
    "27000": "construction_cost",   # Communications
    "28000": "construction_cost",   # Electronic Safety & Security
    "31000": "horizontal",          # Earthwork (alternate numbering)
    "32000": "horizontal",          # Exterior Improvements
    "33000": "horizontal",          # Utilities
    # Virtual/special categories (not CSI divisions, kept for backward compat)
    "gc_fee": "gc_fee",
    "contingency": "contingency",
    "land": "land",
}


def run_calc_engine(
    start_date: datetime,
    total_months: int,
    total_units: int,
    cost_of_sale_pct: float,
    line_items: List[LineItemInput],
    units: List[UnitInput],
    tranches: List[TrancheInput],
    promote_tiers: List[PromoteTierInput],
) -> CalcResult:
    """
    Run the full calculation engine.
    Returns monthly cashflow rows and project-level metrics.
    """
    # ── Step 1: Distribute budget line items across months ──
    # month_costs[month_number][category] = amount
    month_costs: Dict[int, Dict[str, float]] = {}
    for m in range(total_months):
        month_costs[m] = {cat: 0.0 for cat in CATEGORY_MAP.values()}

    for item in line_items:
        if item.budget_amount == 0 or item.duration_months <= 0:
            continue

        if item.forecast_method == "s_curve":
            monthly_amounts = s_curve_distribution(
                item.budget_amount, item.duration_months, item.s_curve_steepness
            )
        elif item.forecast_method == "straight_line":
            monthly_amounts = straight_line_distribution(
                item.budget_amount, item.duration_months
            )
        else:
            # Manual or other: spread evenly
            monthly_amounts = straight_line_distribution(
                item.budget_amount, item.duration_months
            )

        # Determine category field: use DIVISION_MAP if division_code exists, else CATEGORY_MAP
        if item.division_code and item.division_code in DIVISION_MAP:
            category_field = DIVISION_MAP[item.division_code]
        else:
            category_field = CATEGORY_MAP.get(item.category, "other")

        for i, amount in enumerate(monthly_amounts):
            month_idx = item.start_month + i
            if 0 <= month_idx < total_months:
                month_costs[month_idx][category_field] += amount

    # ── Step 2: Build unit sales by month ──
    sales_by_month: Dict[int, Tuple[float, int]] = {}  # month -> (total_sales, unit_count)
    for unit in units:
        if unit.sale_month is not None and unit.sale_price:
            if unit.sale_month not in sales_by_month:
                sales_by_month[unit.sale_month] = (0.0, 0)
            prev_sales, prev_count = sales_by_month[unit.sale_month]
            sales_by_month[unit.sale_month] = (prev_sales + float(unit.sale_price), prev_count + 1)

    # ── Step 3: Initialize financing tranche states ──
    tranche_states: List[TrancheState] = []
    total_equity_committed = 0.0
    gp_equity = 0.0
    lp_equity = 0.0
    senior_committed = 0.0
    preferred_return_rate = 0.0

    for t in tranches:
        state = TrancheState(
            type=t.type,
            committed_amount=t.committed_amount,
            interest_rate=t.interest_rate,
            origination_fee_pct=t.origination_fee_pct,
            loan_release_pct=t.loan_release_pct,
            gp_equity_pct=t.gp_equity_pct,
            lp_equity_pct=t.lp_equity_pct,
        )
        tranche_states.append(state)

        if t.type in ("equity_gp", "equity_lp", "equity"):
            total_equity_committed += t.committed_amount
            gp_equity += t.committed_amount * t.gp_equity_pct
            lp_equity += t.committed_amount * t.lp_equity_pct
            preferred_return_rate = t.preferred_return_rate
        elif t.type == "senior":
            senior_committed = t.committed_amount

    # ── Step 4: Compute monthly cashflows ──
    cashflows: List[MonthlyCashflowRow] = []
    cumulative_dev_cost = 0.0
    cumulative_cf = 0.0
    peak_equity = 0.0
    peak_debt = 0.0
    total_equity_drawn = 0.0

    # For XIRR calculations
    equity_dates: List[datetime] = []
    equity_cfs: List[float] = []
    unlevered_dates: List[datetime] = []
    unlevered_cfs: List[float] = []

    for m in range(total_months):
        cal_date = start_date + relativedelta(months=m)
        row = MonthlyCashflowRow(month_number=m, calendar_date=cal_date)

        # Cost fields
        costs = month_costs.get(m, {cat: 0.0 for cat in CATEGORY_MAP.values()})
        row.construction_cost = costs.get("construction_cost", 0.0)
        row.contingency = costs.get("contingency", 0.0)
        row.horizontal = costs.get("horizontal", 0.0)
        row.soft_costs = costs.get("soft_costs", 0.0)
        row.gc_fee = costs.get("gc_fee", 0.0)
        row.land = costs.get("land", 0.0)
        row.other = costs.get("other", 0.0)

        row.total_development_cost = (
            row.construction_cost + row.contingency + row.horizontal
            + row.soft_costs + row.gc_fee + row.land + row.other
        )

        cumulative_dev_cost += row.total_development_cost
        row.cumulative_development_cost = cumulative_dev_cost

        # Sales
        gross_sales, units_closing = sales_by_month.get(m, (0.0, 0))

        # Financing
        fin = compute_monthly_financing(
            month_dev_cost=row.total_development_cost,
            gross_sales=gross_sales,
            cost_of_sale_pct=cost_of_sale_pct,
            tranches=tranche_states,
            units_closing=units_closing,
            total_units=total_units,
        )

        row.equity_draw = fin["equity_draw"]
        row.senior_draw = fin["senior_draw"]
        row.senior_balance = fin["senior_balance"]
        row.senior_interest = fin["senior_interest"]
        row.mezz_draw = fin["mezz_draw"]
        row.mezz_balance = fin["mezz_balance"]
        row.mezz_interest = fin["mezz_interest"]
        row.land_loan_draw = fin["land_loan_draw"]
        row.land_loan_balance = fin["land_loan_balance"]
        row.gross_sales = fin["gross_sales"]
        row.cost_of_sale = fin["cost_of_sale"]
        row.net_sales = fin["net_sales"]
        row.loan_payoff_from_sales = fin["loan_payoff_from_sales"]

        # Free cashflow to equity
        row.free_cashflow = row.net_sales - row.equity_draw
        cumulative_cf += row.free_cashflow
        row.cumulative_cashflow = cumulative_cf

        # Track peaks
        total_equity_drawn += row.equity_draw
        peak_equity = max(peak_equity, total_equity_drawn)
        peak_debt = max(peak_debt, row.senior_balance + row.mezz_balance)

        # Build XIRR streams
        if row.equity_draw > 0 or row.net_sales > 0:
            equity_cf = -row.equity_draw + (row.net_sales if row.gross_sales > 0 else 0)
            if equity_cf != 0:
                equity_dates.append(cal_date)
                equity_cfs.append(equity_cf)

        # Unlevered XIRR: total dev cost as outflow, net revenue as inflow
        unlevered_cf = -row.total_development_cost + (gross_sales - fin["cost_of_sale"] if gross_sales > 0 else 0)
        if unlevered_cf != 0:
            unlevered_dates.append(cal_date)
            unlevered_cfs.append(unlevered_cf)

        cashflows.append(row)

    # ── Step 5: Compute project metrics ──
    metrics = ProjectMetrics()
    metrics.total_development_cost = cumulative_dev_cost

    total_senior_interest = sum(r.senior_interest for r in cashflows)
    total_mezz_interest = sum(r.mezz_interest for r in cashflows)
    metrics.senior_interest = total_senior_interest
    metrics.total_financing_cost = total_senior_interest + total_mezz_interest

    # Add origination fees to financing cost
    for t in tranches:
        if t.type == "senior":
            metrics.total_financing_cost += t.committed_amount * t.origination_fee_pct

    metrics.total_with_financing = cumulative_dev_cost + metrics.total_financing_cost

    metrics.total_revenue = sum(r.gross_sales for r in cashflows)
    metrics.total_cost_of_sale = sum(r.cost_of_sale for r in cashflows)
    metrics.senior_debt_committed = senior_committed
    metrics.total_equity = total_equity_committed
    metrics.gp_equity = gp_equity
    metrics.lp_equity = lp_equity
    metrics.peak_equity = peak_equity
    metrics.peak_debt_balance = peak_debt

    if cumulative_dev_cost > 0:
        metrics.ltc_ratio = senior_committed / cumulative_dev_cost

    # Profit
    metrics.project_profit_val = project_profit(
        metrics.total_revenue, cumulative_dev_cost,
        metrics.total_financing_cost, metrics.total_cost_of_sale
    )
    metrics.profit_margin_val = profit_margin(metrics.project_profit_val, metrics.total_revenue) or 0.0

    # XIRR
    metrics.levered_xirr = xirr(equity_dates, equity_cfs)
    metrics.unlevered_xirr = xirr(unlevered_dates, unlevered_cfs)

    # Equity multiple
    total_distributions = sum(max(0, cf) for cf in equity_cfs)
    total_contributions = sum(abs(min(0, cf)) for cf in equity_cfs)
    metrics.equity_multiple_val = equity_multiple(total_distributions, total_contributions)

    # ── Step 6: Waterfall ──
    project_duration_years = total_months / 12.0
    tier_defs = [
        PromoteTierDef(
            sequence=pt.sequence,
            hurdle_rate=pt.hurdle_rate,
            gp_split=pt.gp_split,
            lp_split=pt.lp_split,
        )
        for pt in promote_tiers
    ]

    total_distributable = metrics.total_revenue - metrics.total_cost_of_sale - metrics.total_financing_cost - cumulative_dev_cost + total_equity_committed
    # total_distributable = equity return + profit
    # Actually: total cash available to equity = total revenue - cost of sale - loan payoffs - dev costs funded by equity
    # Simpler: total_distributable = total equity invested + project profit after financing
    distributable = total_equity_committed + metrics.project_profit_val

    if distributable > 0 and gp_equity > 0 and lp_equity > 0:
        wf = compute_waterfall(
            total_distributable=distributable,
            gp_equity=gp_equity,
            lp_equity=lp_equity,
            preferred_return_rate=preferred_return_rate,
            tiers=tier_defs,
            project_duration_years=project_duration_years,
        )
        metrics.waterfall = wf
        metrics.gp_multiple = wf.gp_multiple
        metrics.lp_multiple = wf.lp_multiple

        # GP/LP XIRR - build separate cashflow streams
        if equity_dates and equity_cfs:
            gp_cfs = []
            lp_cfs = []
            gp_pct_of_equity = gp_equity / total_equity_committed if total_equity_committed > 0 else 0
            lp_pct_of_equity = lp_equity / total_equity_committed if total_equity_committed > 0 else 0

            for cf in equity_cfs:
                if cf < 0:
                    # Contributions split by equity %
                    gp_cfs.append(cf * gp_pct_of_equity)
                    lp_cfs.append(cf * lp_pct_of_equity)
                else:
                    # Distributions split by waterfall (approximate: use overall split)
                    gp_dist_pct = wf.total_gp / distributable if distributable > 0 else gp_pct_of_equity
                    lp_dist_pct = wf.total_lp / distributable if distributable > 0 else lp_pct_of_equity
                    gp_cfs.append(cf * gp_dist_pct)
                    lp_cfs.append(cf * lp_dist_pct)

            metrics.gp_xirr = xirr(equity_dates, gp_cfs)
            metrics.lp_xirr = xirr(equity_dates, lp_cfs)

    return CalcResult(cashflows=cashflows, metrics=metrics)
