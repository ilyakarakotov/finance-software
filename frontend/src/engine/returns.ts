/**
 * Client-side return metric calculations for live preview.
 * The Python backend engine is the source of truth.
 */

export function equityMultiple(
  totalDistributions: number,
  totalContributions: number
): number | null {
  if (totalContributions === 0) return null;
  return totalDistributions / totalContributions;
}

export function projectProfit(
  totalRevenue: number,
  totalDevCost: number,
  financingCosts: number,
  costOfSale: number
): number {
  return totalRevenue - totalDevCost - financingCosts - costOfSale;
}

export function profitMargin(profit: number, revenue: number): number | null {
  if (revenue === 0) return null;
  return profit / revenue;
}
