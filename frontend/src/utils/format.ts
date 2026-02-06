export function formatCurrency(value: number | null | undefined): string {
  if (value == null) return '—';
  const abs = Math.abs(value);
  const formatted = abs.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
  if (value < 0) return `($${formatted})`;
  return `$${formatted}`;
}

export function formatCurrencyDetailed(value: number | null | undefined): string {
  if (value == null) return '—';
  const abs = Math.abs(value);
  const formatted = abs.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  if (value < 0) return `($${formatted})`;
  return `$${formatted}`;
}

export function formatPercent(value: number | null | undefined, decimals: number = 1): string {
  if (value == null) return '—';
  return `${(value * 100).toFixed(decimals)}%`;
}

export function formatMultiple(value: number | null | undefined): string {
  if (value == null) return '—';
  return `${value.toFixed(2)}x`;
}

export function formatNumber(value: number | null | undefined): string {
  if (value == null) return '—';
  return value.toLocaleString('en-US');
}

export function formatMonthDate(dateStr: string | undefined | null): string {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

export function parseCurrencyInput(value: string): number {
  const cleaned = value.replace(/[$,()]/g, '').trim();
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

export function parsePercentInput(value: string): number {
  const cleaned = value.replace(/%/g, '').trim();
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num / 100;
}
