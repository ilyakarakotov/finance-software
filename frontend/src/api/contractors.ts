import { api } from './client';
import type { Contractor, ContractorCreate } from '../types/contractor';

export const contractorsApi = {
  listForBuilding: (buildingId: number) =>
    api.get<Contractor[]>(`/contractors?building_id=${buildingId}`),
  create: (data: ContractorCreate) => api.post<Contractor>('/contractors', data),
  update: (id: number, data: Partial<ContractorCreate>) =>
    api.put<Contractor>(`/contractors/${id}`, data),
  delete: (id: number) => api.delete(`/contractors/${id}`),
  seedDefaults: (buildingId: number) =>
    api.post<Contractor[]>(`/contractors/${buildingId}/seed-defaults`, {}),
};
