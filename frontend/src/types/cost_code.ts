export interface CostCode {
  cost_code_id: number;
  division_number: string;
  division_name: string;
  category_number: string;
  category_name: string;
  subcategory_number: string;
  subcategory_name: string;
  item_code: string;
  item_name: string;
  income_account_number?: string;
  income_account_name?: string;
  expense_account_number?: string;
  expense_account_name?: string;
  default_unit_type?: string;
  default_unit_price?: number;
}

export interface CostCodeCreate {
  division_number: string;
  division_name: string;
  category_number: string;
  category_name: string;
  subcategory_number: string;
  subcategory_name: string;
  item_code: string;
  item_name: string;
  income_account_number?: string;
  income_account_name?: string;
  expense_account_number?: string;
  expense_account_name?: string;
  default_unit_type?: string;
  default_unit_price?: number;
}

export interface CostCodeTreeNode {
  division_number: string;
  division_name: string;
  categories: CategoryNode[];
}

export interface CategoryNode {
  category_number: string;
  category_name: string;
  subcategories: SubcategoryNode[];
}

export interface SubcategoryNode {
  subcategory_number: string;
  subcategory_name: string;
  items: CostCode[];
}

export interface CostCodeTree {
  divisions: CostCodeTreeNode[];
}

export type UnitType = 'gsf' | 'far' | 'gar_sf' | 'slab' | 'units' | 'months' | 'weeks' | 'days' | 'ls' | 'ea';

export const UNIT_TYPE_LABELS: Record<UnitType, string> = {
  gsf: 'Gross SF',
  far: 'FAR SF',
  gar_sf: 'Garage SF',
  slab: 'Slab SF',
  units: 'Units',
  months: 'Months',
  weeks: 'Weeks',
  days: 'Days',
  ls: 'Lump Sum',
  ea: 'Each',
};
