export interface Project {
  project_id: number;
  name: string;
  address?: string;
  lot_size_acres?: number;
  start_date?: string;
  total_units?: number;
  total_sf?: number;
  cost_of_sale_pct: number;
  gc_fee_pct: number;
  contingency_pct: number;
  sales_tax_rate: number;
  construction_cost_psf: number;
  soft_costs_pct: number;
  gp_equity_pct: number;
  preferred_return_rate: number;
  senior_debt_rate: number;
  loan_release_pct: number;
  land_loan_origination_pct: number;
  use_ltc_ratio: boolean;
  ltc_ratio?: number | null;
}

export interface ProjectDetail extends Project {
  phases: Phase[];
}

export interface Phase {
  phase_id: number;
  project_id: number;
  name: string;
  start_month: number;
  sequence: number;
  buildings: Building[];
}

export interface Building {
  building_id: number;
  phase_id: number;
  name: string;
  unit_count: number;
  sf_per_unit?: number;
  total_sf?: number;
  construction_start_month: number;
  construction_duration: number;
  units: Unit[];
}

export interface Unit {
  unit_id: number;
  building_id: number;
  unit_number: string;
  sf?: number;
  sale_price?: number;
  sale_month?: number | null;
  price_per_sf?: number | null;
  status: string;
}

export interface ProjectCreate {
  name: string;
  address?: string;
  lot_size_acres?: number;
  start_date?: string;
  total_units?: number;
  total_sf?: number;
  cost_of_sale_pct?: number;
  gc_fee_pct?: number;
  contingency_pct?: number;
  sales_tax_rate?: number;
  construction_cost_psf?: number;
  soft_costs_pct?: number;
  gp_equity_pct?: number;
  preferred_return_rate?: number;
  senior_debt_rate?: number;
  loan_release_pct?: number;
  land_loan_origination_pct?: number;
  use_ltc_ratio?: boolean;
  ltc_ratio?: number | null;
}

export interface PhaseCreate {
  name: string;
  start_month: number;
  sequence: number;
}

export interface BuildingCreate {
  phase_id: number;
  name: string;
  unit_count: number;
  sf_per_unit?: number;
  total_sf?: number;
  construction_start_month?: number;
  construction_duration?: number;
}

export interface BuildingUpdate {
  name?: string;
  unit_count?: number;
  sf_per_unit?: number;
  total_sf?: number;
  construction_start_month?: number;
  construction_duration?: number;
}
