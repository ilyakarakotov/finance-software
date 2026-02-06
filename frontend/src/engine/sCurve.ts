/**
 * Client-side S-curve distribution for inline sparkline previews.
 * The Python backend engine is the source of truth for actual calculations.
 */

export function sCurveDistribution(
  totalAmount: number,
  durationMonths: number,
  steepness: number = 5
): number[] {
  if (durationMonths <= 0) return [];
  if (durationMonths === 1) return [totalAmount];

  const k = steepness;
  const midpoint = durationMonths / 2;

  // Cumulative S-curve values
  const cumulative: number[] = [];
  for (let m = 0; m <= durationMonths; m++) {
    cumulative.push(1 / (1 + Math.exp(-k * (m - midpoint) / durationMonths * 4)));
  }

  // Normalize to get monthly increments
  const totalCurve = cumulative[durationMonths] - cumulative[0];
  const monthly: number[] = [];
  for (let m = 0; m < durationMonths; m++) {
    monthly.push(((cumulative[m + 1] - cumulative[m]) / totalCurve) * totalAmount);
  }

  // Adjust rounding
  const diff = totalAmount - monthly.reduce((a, b) => a + b, 0);
  monthly[monthly.length - 1] += diff;

  return monthly;
}

export function straightLineDistribution(
  totalAmount: number,
  durationMonths: number
): number[] {
  if (durationMonths <= 0) return [];
  if (durationMonths === 1) return [totalAmount];

  const monthlyAmount = totalAmount / durationMonths;
  const monthly = Array(durationMonths).fill(monthlyAmount);

  const diff = totalAmount - monthly.reduce((a: number, b: number) => a + b, 0);
  monthly[monthly.length - 1] += diff;

  return monthly;
}
