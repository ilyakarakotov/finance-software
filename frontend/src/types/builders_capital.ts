export interface BCMapping {
  mapping_id: number;
  project_id: number;
  building_id?: number | null;
  bc_category: string;
  csi_code?: string;
  description?: string;
  amount: number;
  tax_rate: number;
  amount_with_tax: number;
  comments?: string;
  adjustment: number;
  final_amount: number;
  sort_order: number;
}

export interface BCMappingCreate {
  project_id: number;
  building_id?: number | null;
  bc_category: string;
  csi_code?: string;
  description?: string;
  amount: number;
  tax_rate: number;
  comments?: string;
  adjustment?: number;
  sort_order?: number;
}

export interface BCSummary {
  bc_category: string;
  total_amount: number;
  total_with_tax: number;
  count: number;
}
