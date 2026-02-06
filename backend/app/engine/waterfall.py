from typing import List, Dict, Optional
from dataclasses import dataclass, field


@dataclass
class PromoteTierDef:
    sequence: int
    hurdle_rate: float
    gp_split: float
    lp_split: float


@dataclass
class WaterfallResult:
    gp_return_of_capital: float = 0.0
    lp_return_of_capital: float = 0.0
    gp_preferred_return: float = 0.0
    lp_preferred_return: float = 0.0
    gp_promote_by_tier: Dict[int, float] = field(default_factory=dict)
    lp_promote_by_tier: Dict[int, float] = field(default_factory=dict)
    total_gp: float = 0.0
    total_lp: float = 0.0
    gp_multiple: float = 0.0
    lp_multiple: float = 0.0


def compute_waterfall(
    total_distributable: float,
    gp_equity: float,
    lp_equity: float,
    preferred_return_rate: float,
    tiers: List[PromoteTierDef],
    project_duration_years: float,
) -> WaterfallResult:
    """
    Apply the promote structure to total distributable profit.

    1. Return of capital: LP gets back their equity, GP gets back their equity
    2. Preferred return: accrue at pref_rate on unreturned capital, pay pro-rata
    3. Tier 1+: split remaining profit at tier GP/LP splits
    """
    result = WaterfallResult()
    remaining = total_distributable
    total_equity = gp_equity + lp_equity

    if total_equity <= 0:
        return result

    gp_pct = gp_equity / total_equity if total_equity > 0 else 0
    lp_pct = lp_equity / total_equity if total_equity > 0 else 0

    # Step 1: Return of capital
    capital_return = min(remaining, total_equity)
    result.gp_return_of_capital = capital_return * gp_pct
    result.lp_return_of_capital = capital_return * lp_pct
    remaining -= capital_return

    if remaining <= 0:
        result.total_gp = result.gp_return_of_capital
        result.total_lp = result.lp_return_of_capital
        result.gp_multiple = result.total_gp / gp_equity if gp_equity > 0 else 0
        result.lp_multiple = result.total_lp / lp_equity if lp_equity > 0 else 0
        return result

    # Step 2: Preferred return
    pref_amount = total_equity * preferred_return_rate * project_duration_years
    pref_paid = min(remaining, pref_amount)
    result.gp_preferred_return = pref_paid * gp_pct
    result.lp_preferred_return = pref_paid * lp_pct
    remaining -= pref_paid

    # Step 3+: Promote tiers
    sorted_tiers = sorted([t for t in tiers if t.sequence > 0], key=lambda t: t.sequence)

    for i, tier in enumerate(sorted_tiers):
        if remaining <= 0:
            break

        if i < len(sorted_tiers) - 1:
            # Calculate how much profit falls in this tier
            next_hurdle = sorted_tiers[i + 1].hurdle_rate if i + 1 < len(sorted_tiers) else float('inf')
            # Simple approach: split remaining at this tier's split
            # For the last tier, take all remaining
            tier_amount = remaining
        else:
            tier_amount = remaining

        gp_share = tier_amount * tier.gp_split
        lp_share = tier_amount * tier.lp_split
        result.gp_promote_by_tier[tier.sequence] = gp_share
        result.lp_promote_by_tier[tier.sequence] = lp_share
        remaining -= tier_amount

    # Totals
    result.total_gp = (
        result.gp_return_of_capital
        + result.gp_preferred_return
        + sum(result.gp_promote_by_tier.values())
    )
    result.total_lp = (
        result.lp_return_of_capital
        + result.lp_preferred_return
        + sum(result.lp_promote_by_tier.values())
    )

    result.gp_multiple = result.total_gp / gp_equity if gp_equity > 0 else 0
    result.lp_multiple = result.total_lp / lp_equity if lp_equity > 0 else 0

    return result
