from typing import Dict, List, Optional
from dataclasses import dataclass


@dataclass
class TrancheState:
    type: str
    committed_amount: float
    interest_rate: float
    origination_fee_pct: float
    loan_release_pct: float
    gp_equity_pct: float
    lp_equity_pct: float
    balance: float = 0.0
    total_drawn: float = 0.0
    total_interest: float = 0.0
    total_payoff: float = 0.0


def compute_monthly_financing(
    month_dev_cost: float,
    gross_sales: float,
    cost_of_sale_pct: float,
    tranches: List[TrancheState],
    units_closing: int = 0,
    total_units: int = 50,
) -> Dict[str, float]:
    """
    Compute financing flows for a single month.
    Order: equity first, then mezz, then senior debt.
    Returns dict of all financing-related values for the month.
    """
    result = {
        "equity_draw": 0.0,
        "senior_draw": 0.0,
        "senior_balance": 0.0,
        "senior_interest": 0.0,
        "mezz_draw": 0.0,
        "mezz_balance": 0.0,
        "mezz_interest": 0.0,
        "land_loan_draw": 0.0,
        "land_loan_balance": 0.0,
        "gross_sales": gross_sales,
        "cost_of_sale": gross_sales * cost_of_sale_pct,
        "loan_payoff_from_sales": 0.0,
        "net_sales": 0.0,
    }

    remaining_cost = month_dev_cost

    # Find tranches by type
    equity_tranche = next((t for t in tranches if t.type in ("equity_gp", "equity_lp", "equity")), None)
    senior_tranche = next((t for t in tranches if t.type == "senior"), None)
    mezz_tranche = next((t for t in tranches if t.type == "mezz"), None)
    land_tranche = next((t for t in tranches if t.type == "land_loan"), None)

    # Step 1: Equity draws (equity funds first)
    if equity_tranche and remaining_cost > 0:
        equity_available = equity_tranche.committed_amount - equity_tranche.total_drawn
        equity_draw = min(remaining_cost, max(0, equity_available))
        result["equity_draw"] = equity_draw
        equity_tranche.total_drawn += equity_draw
        equity_tranche.balance += equity_draw
        remaining_cost -= equity_draw

    # Step 2: Mezz draws (if applicable)
    if mezz_tranche and remaining_cost > 0:
        mezz_available = mezz_tranche.committed_amount - mezz_tranche.total_drawn
        mezz_draw = min(remaining_cost, max(0, mezz_available))
        result["mezz_draw"] = mezz_draw
        mezz_tranche.total_drawn += mezz_draw
        mezz_tranche.balance += mezz_draw
        remaining_cost -= mezz_draw

    # Step 3: Senior debt draws
    if senior_tranche and remaining_cost > 0:
        senior_available = senior_tranche.committed_amount - senior_tranche.total_drawn
        senior_draw = min(remaining_cost, max(0, senior_available))
        result["senior_draw"] = senior_draw
        senior_tranche.total_drawn += senior_draw
        senior_tranche.balance += senior_draw
        remaining_cost -= senior_draw

    # Step 4: Land loan draws
    if land_tranche and remaining_cost > 0:
        land_available = land_tranche.committed_amount - land_tranche.total_drawn
        land_draw = min(remaining_cost, max(0, land_available))
        result["land_loan_draw"] = land_draw
        land_tranche.total_drawn += land_draw
        land_tranche.balance += land_draw
        remaining_cost -= land_draw

    # Step 5: Interest accrual (balance × monthly_rate)
    if senior_tranche:
        monthly_rate = senior_tranche.interest_rate / 12
        interest = senior_tranche.balance * monthly_rate
        result["senior_interest"] = interest
        senior_tranche.total_interest += interest
        senior_tranche.balance += interest  # Interest capitalizes

    if mezz_tranche:
        monthly_rate = mezz_tranche.interest_rate / 12
        interest = mezz_tranche.balance * monthly_rate
        result["mezz_interest"] = interest
        mezz_tranche.total_interest += interest
        mezz_tranche.balance += interest

    # Step 6: Loan payoff from sales
    total_loan_payoff = 0.0
    if gross_sales > 0 and senior_tranche:
        # Per-unit allocated loan payoff
        per_unit_loan = senior_tranche.committed_amount / total_units if total_units > 0 else 0
        payoff = per_unit_loan * senior_tranche.loan_release_pct * units_closing
        payoff = min(payoff, senior_tranche.balance)
        total_loan_payoff += payoff
        senior_tranche.balance -= payoff
        senior_tranche.total_payoff += payoff

    result["loan_payoff_from_sales"] = total_loan_payoff

    # Step 7: Net sales
    cost_of_sale = result["cost_of_sale"]
    result["net_sales"] = gross_sales - cost_of_sale - total_loan_payoff

    # Record balances
    if senior_tranche:
        result["senior_balance"] = senior_tranche.balance
    if mezz_tranche:
        result["mezz_balance"] = mezz_tranche.balance
    if land_tranche:
        result["land_loan_balance"] = land_tranche.balance

    return result
