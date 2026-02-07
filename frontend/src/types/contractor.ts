export interface Contractor {
  contractor_id: number;
  building_id: number;
  name: string;
  code: string;
  scope_description?: string;
}

export interface ContractorCreate {
  building_id: number;
  name: string;
  code: string;
  scope_description?: string;
}
