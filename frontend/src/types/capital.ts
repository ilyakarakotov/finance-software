export type TrancheType = 'equity' | 'equity_gp' | 'equity_lp' | 'mezz' | 'senior' | 'land_loan';

export interface CapitalStackTranche {
  tranche_id: number;
  project_id: number;
  type: TrancheType;
  committed_amount: number;
  interest_rate: number;
  origination_fee_pct: number;
  gp_equity_pct: number;
  lp_equity_pct: number;
  preferred_return_rate: number;
  loan_release_pct: number;
}

export interface CapitalStackTrancheCreate {
  project_id: number;
  type: TrancheType;
  committed_amount: number;
  interest_rate: number;
  origination_fee_pct: number;
  gp_equity_pct: number;
  lp_equity_pct: number;
  preferred_return_rate: number;
  loan_release_pct: number;
}

export interface PromoteTier {
  tier_id: number;
  project_id: number;
  sequence: number;
  hurdle_rate: number;
  gp_split: number;
  lp_split: number;
}

export interface PromoteTierCreate {
  project_id: number;
  sequence: number;
  hurdle_rate: number;
  gp_split: number;
  lp_split: number;
}
