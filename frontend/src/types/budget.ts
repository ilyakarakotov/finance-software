export type BudgetCategory =
  | 'construction'
  | 'contingency'
  | 'horizontal'
  | 'soft_costs'
  | 'gc_fee'
  | 'land'
  | 'other';

export type ForecastMethod = 's_curve' | 'straight_line' | 'manual';

export interface BudgetLineItem {
  line_item_id: number;
  project_id: number;
  building_id?: number | null;
  category: BudgetCategory;
  subcategory?: string;
  csi_code?: string;
  description?: string;
  budget_amount: number;
  forecast_method: ForecastMethod;
  start_month: number;
  duration_months: number;
  s_curve_steepness: number;
  is_auto_generated: boolean;
  // New fields for hierarchical budgeting
  cost_code_id?: number | null;
  division_code?: string;
  contractor_id?: number | null;
  unit_type?: string;
  quantity?: number;
  unit_price?: number;
  standard_cost?: number;
  ps_unit_type?: string;
  ps_quantity?: number;
  ps_unit_price?: number;
  project_specific_cost?: number;
  parent_line_item_id?: number | null;
  hierarchy_level?: number;
  sort_order?: number;
  is_summary_row?: boolean;
  sf_cost?: number;
  benchmark_pct?: number;
  notes?: string;
}

export interface BudgetLineItemCreate {
  project_id: number;
  building_id?: number | null;
  category: BudgetCategory;
  subcategory?: string;
  csi_code?: string;
  description?: string;
  budget_amount: number;
  forecast_method: ForecastMethod;
  start_month: number;
  duration_months: number;
  s_curve_steepness: number;
  is_auto_generated?: boolean;
  // New fields for hierarchical budgeting
  cost_code_id?: number | null;
  division_code?: string;
  contractor_id?: number | null;
  unit_type?: string;
  quantity?: number;
  unit_price?: number;
  standard_cost?: number;
  ps_unit_type?: string;
  ps_quantity?: number;
  ps_unit_price?: number;
  project_specific_cost?: number;
  parent_line_item_id?: number | null;
  hierarchy_level?: number;
  sort_order?: number;
  is_summary_row?: boolean;
  sf_cost?: number;
  benchmark_pct?: number;
  notes?: string;
}

export interface BudgetTreeNode extends BudgetLineItem {
  children: BudgetTreeNode[];
}

export interface BudgetTotals {
  total_budget: number;
  total_standard_cost: number;
  total_project_specific: number;
  total_sf_cost: number;
  by_division: Record<string, number>;
  by_category: Record<string, number>;
}

export const CATEGORY_LABELS: Record<BudgetCategory, string> = {
  construction: 'Construction',
  contingency: 'Contingency',
  horizontal: 'Horizontal',
  soft_costs: 'Soft Costs',
  gc_fee: 'GC Fee',
  land: 'Land',
  other: 'Other',
};

export const CATEGORY_ORDER: BudgetCategory[] = [
  'construction',
  'contingency',
  'horizontal',
  'soft_costs',
  'gc_fee',
  'land',
  'other',
];
