export interface LoanDrawPeriod {
  period_id: number;
  loan_draw_id: number;
  draw_number: number;
  draw_date?: string;
  amount: number;
}

export interface LoanDraw {
  loan_draw_id: number;
  project_id: number;
  building_id?: number | null;
  loan_number?: string;
  inspection_date?: string;
  draw_category: string;
  description: string;
  csi_code?: string;
  budget_amount: number;
  drawn_at_closing: number;
  draw_budget: number; // computed: budget_amount - drawn_at_closing
  sort_order: number;
  periods: LoanDrawPeriod[];
}

export interface LoanDrawCreate {
  project_id: number;
  building_id?: number | null;
  loan_number?: string;
  inspection_date?: string;
  draw_category: string;
  description: string;
  csi_code?: string;
  budget_amount: number;
  drawn_at_closing: number;
  sort_order?: number;
}

export interface LoanDrawSummary {
  category: DrawCategory;
  total_budget: number;
  total_drawn_at_closing: number;
  total_draw_budget: number;
  draws: LoanDraw[];
}

export type DrawCategory = 'land' | 'soft_costs' | 'bank_fees' | 'hard_costs';

export const DRAW_CATEGORY_LABELS: Record<DrawCategory, string> = {
  land: 'Land',
  soft_costs: 'Soft Costs',
  bank_fees: 'Bank Fees',
  hard_costs: 'Hard Costs',
};
