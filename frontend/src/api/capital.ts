import { api } from './client';
import type { CapitalStackTranche, CapitalStackTrancheCreate, PromoteTier, PromoteTierCreate } from '../types/capital';

export const capitalApi = {
  listTranches: (projectId: number) =>
    api.get<CapitalStackTranche[]>(`/capital/${projectId}/tranches`),
  createTranche: (data: CapitalStackTrancheCreate) =>
    api.post<CapitalStackTranche>('/capital/tranches', data),
  bulkCreateTranches: (items: CapitalStackTrancheCreate[]) =>
    api.post<CapitalStackTranche[]>('/capital/tranches/bulk', items),
  updateTranche: (id: number, data: Partial<CapitalStackTrancheCreate>) =>
    api.put<CapitalStackTranche>(`/capital/tranches/${id}`, data),
  deleteTranche: (id: number) => api.delete(`/capital/tranches/${id}`),

  listPromoteTiers: (projectId: number) =>
    api.get<PromoteTier[]>(`/capital/${projectId}/promote-tiers`),
  createPromoteTier: (data: PromoteTierCreate) =>
    api.post<PromoteTier>('/capital/promote-tiers', data),
  bulkCreatePromoteTiers: (items: PromoteTierCreate[]) =>
    api.post<PromoteTier[]>('/capital/promote-tiers/bulk', items),
  updatePromoteTier: (id: number, data: Partial<PromoteTierCreate>) =>
    api.put<PromoteTier>(`/capital/promote-tiers/${id}`, data),
  deletePromoteTier: (id: number) => api.delete(`/capital/promote-tiers/${id}`),
};
