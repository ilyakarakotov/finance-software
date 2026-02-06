export interface MonthlyCashflow {
  cf_id?: number;
  project_id: number;
  month_number: number;
  calendar_date?: string;
  construction_cost: number;
  contingency: number;
  horizontal: number;
  soft_costs: number;
  gc_fee: number;
  land: number;
  other: number;
  total_development_cost: number;
  cumulative_development_cost: number;
  equity_draw: number;
  senior_draw: number;
  senior_balance: number;
  senior_interest: number;
  mezz_draw: number;
  mezz_balance: number;
  mezz_interest: number;
  land_loan_draw: number;
  land_loan_balance: number;
  gross_sales: number;
  cost_of_sale: number;
  net_sales: number;
  loan_payoff_from_sales: number;
  free_cashflow: number;
  cumulative_cashflow: number;
}

export interface WaterfallResult {
  gp_return_of_capital: number;
  lp_return_of_capital: number;
  gp_preferred_return: number;
  lp_preferred_return: number;
  gp_promote_by_tier: Record<string, number>;
  lp_promote_by_tier: Record<string, number>;
  total_gp: number;
  total_lp: number;
  gp_multiple: number;
  lp_multiple: number;
}

export interface ProjectMetrics {
  total_development_cost: number;
  total_with_financing: number;
  total_revenue: number;
  total_cost_of_sale: number;
  senior_debt_committed: number;
  total_equity: number;
  gp_equity: number;
  lp_equity: number;
  senior_interest: number;
  project_profit: number;
  profit_margin: number;
  levered_xirr?: number | null;
  unlevered_xirr?: number | null;
  equity_multiple?: number | null;
  gp_xirr?: number | null;
  lp_xirr?: number | null;
  gp_multiple?: number | null;
  lp_multiple?: number | null;
  ltc_ratio?: number | null;
  peak_equity: number;
  peak_debt_balance: number;
  total_financing_cost: number;
  waterfall?: WaterfallResult | null;
}

export interface RecalcResponse {
  cashflows: MonthlyCashflow[];
  metrics: ProjectMetrics;
}

export interface SensitivityCell {
  sale_price_psf: number;
  construction_cost_psf: number;
  project_profit: number;
  xirr?: number | null;
}

export interface SensitivityGrid {
  sale_price_psf_values: number[];
  construction_cost_psf_values: number[];
  cells: SensitivityCell[][];
}

export interface PriceSolverRequest {
  target_metric: 'profit_margin' | 'equity_multiple' | 'levered_irr';
  target_value: number;
  distribution_mode: 'uniform' | 'proportional';
}

export interface BuildingPriceSuggestion {
  building_id: number;
  building_name: string;
  suggested_psf: number;
  unit_count: number;
  total_sf: number;
}

export interface PriceSolverResponse {
  required_avg_psf: number;
  break_even_psf: number;
  target_revenue: number;
  building_suggestions: BuildingPriceSuggestion[];
}

export interface PricingAnalysis {
  break_even_psf: number;
  current_avg_psf: number;
  margin_above_break_even: number;
  psf_for_20pct_margin: number;
  psf_for_3x_multiple: number;
}
