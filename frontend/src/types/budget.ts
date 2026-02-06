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
