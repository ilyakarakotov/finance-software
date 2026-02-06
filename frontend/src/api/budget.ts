import { api } from './client';
import type { BudgetLineItem, BudgetLineItemCreate } from '../types/budget';

export const budgetApi = {
  list: (projectId: number) => api.get<BudgetLineItem[]>(`/budget/${projectId}`),
  create: (data: BudgetLineItemCreate) => api.post<BudgetLineItem>('/budget/', data),
  bulkCreate: (items: BudgetLineItemCreate[]) => api.post<BudgetLineItem[]>('/budget/bulk', items),
  update: (id: number, data: Partial<BudgetLineItemCreate>) =>
    api.put<BudgetLineItem>(`/budget/${id}`, data),
  delete: (id: number) => api.delete(`/budget/${id}`),
  previewSCurve: (totalAmount: number, durationMonths: number, steepness: number) =>
    api.post<{ monthly_amounts: number[] }>('/budget/s-curve-preview', {
      total_amount: totalAmount,
      duration_months: durationMonths,
      steepness,
    }),
  generateFromBuildings: (projectId: number) =>
    api.post<BudgetLineItem[]>(`/budget/${projectId}/generate-from-buildings`, {}),
};
