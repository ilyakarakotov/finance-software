import numpy as np
from scipy.optimize import brentq
from typing import List, Optional
from datetime import datetime
from dateutil.relativedelta import relativedelta


def xirr(dates: List[datetime], cashflows: List[float], guess: float = 0.1) -> Optional[float]:
    """
    Compute XIRR (annualized IRR) for irregular cashflows.
    dates: list of datetime objects
    cashflows: list of float cashflows (negative = outflow, positive = inflow)
    Returns annualized rate or None if no solution found.
    """
    if not dates or not cashflows or len(dates) != len(cashflows):
        return None

    # Filter out zero cashflows but keep at least one positive and one negative
    has_positive = any(cf > 0 for cf in cashflows)
    has_negative = any(cf < 0 for cf in cashflows)
    if not has_positive or not has_negative:
        return None

    d0 = min(dates)

    def npv(rate):
        if rate <= -1:
            return float('inf')
        return sum(
            cf / (1 + rate) ** ((d - d0).days / 365.25)
            for d, cf in zip(dates, cashflows)
        )

    try:
        return brentq(npv, -0.99, 10.0, xtol=1e-8, maxiter=1000)
    except (ValueError, RuntimeError):
        # Try wider range
        try:
            return brentq(npv, -0.5, 100.0, xtol=1e-8, maxiter=2000)
        except (ValueError, RuntimeError):
            return None


def equity_multiple(total_distributions: float, total_contributions: float) -> Optional[float]:
    """
    Compute equity multiple = total distributions / total contributions
    """
    if total_contributions == 0:
        return None
    return total_distributions / total_contributions


def project_profit(total_revenue: float, total_dev_cost: float,
                   financing_costs: float, cost_of_sale: float) -> float:
    """
    Project profit = total revenue - total development costs - financing costs - cost of sale
    """
    return total_revenue - total_dev_cost - financing_costs - cost_of_sale


def profit_margin(profit: float, revenue: float) -> Optional[float]:
    """
    Profit margin = profit / revenue
    """
    if revenue == 0:
        return None
    return profit / revenue
