import { api } from './client';
import type { CostCode, CostCodeCreate, CostCodeTree } from '../types/cost_code';

export const costCodesApi = {
  list: () => api.get<CostCode[]>('/cost-codes'),
  tree: () => api.get<CostCodeTree>('/cost-codes/tree'),
  search: (q: string) => api.get<CostCode[]>(`/cost-codes/search?q=${encodeURIComponent(q)}`),
  create: (data: CostCodeCreate) => api.post<CostCode>('/cost-codes', data),
  update: (id: number, data: Partial<CostCodeCreate>) =>
    api.put<CostCode>(`/cost-codes/${id}`, data),
  delete: (id: number) => api.delete(`/cost-codes/${id}`),
  seed: () => api.post<{ count: number }>('/cost-codes/seed', {}),
};
