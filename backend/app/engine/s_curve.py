import numpy as np
from typing import List


def s_curve_distribution(total_amount: float, duration_months: int, steepness: int = 5) -> List[float]:
    """
    Distribute total_amount across duration_months using logistic S-curve.
    steepness: 1 (flat/linear) to 9 (steep/concentrated in middle)
    Returns list of monthly amounts that sum to total_amount.
    """
    if duration_months <= 0:
        return []
    if duration_months == 1:
        return [total_amount]

    k = steepness
    midpoint = duration_months / 2
    months = range(duration_months)

    # Cumulative S-curve values
    cumulative = [
        1 / (1 + np.exp(-k * (m - midpoint) / duration_months * 4))
        for m in range(duration_months + 1)
    ]

    # Normalize to get monthly increments
    total_curve = cumulative[-1] - cumulative[0]
    monthly = [
        (cumulative[m + 1] - cumulative[m]) / total_curve * total_amount
        for m in months
    ]

    # Adjust rounding to match total exactly
    diff = total_amount - sum(monthly)
    monthly[-1] += diff

    return monthly


def straight_line_distribution(total_amount: float, duration_months: int) -> List[float]:
    """
    Distribute total_amount evenly across duration_months.
    Returns list of monthly amounts that sum to total_amount.
    """
    if duration_months <= 0:
        return []
    if duration_months == 1:
        return [total_amount]

    monthly_amount = total_amount / duration_months
    monthly = [monthly_amount] * duration_months

    # Adjust rounding
    diff = total_amount - sum(monthly)
    monthly[-1] += diff

    return monthly
