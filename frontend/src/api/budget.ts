import { api } from './client';
import type { BudgetLineItem, BudgetLineItemCreate, BudgetTreeNode, BudgetTotals } from '../types/budget';

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
  tree: (projectId: number) => api.get<BudgetTreeNode[]>(`/budget/${projectId}/tree`),
  byContractor: (projectId: number, buildingId: number) =>
    api.get<BudgetLineItem[]>(`/budget/${projectId}/by-contractor/${buildingId}`),
  totals: (projectId: number) => api.get<BudgetTotals>(`/budget/${projectId}/totals`),
  generateFromTemplate: (projectId: number, buildingId?: number) =>
    api.post<BudgetLineItem[]>(`/budget/${projectId}/generate-from-template${buildingId ? `?building_id=${buildingId}` : ''}`, {}),
  costCodeTree: (projectId: number, buildingId?: number) =>
    api.get<any[]>(`/budget/${projectId}/cost-code-tree${buildingId ? `?building_id=${buildingId}` : ''}`),
  sfAnalysis: (projectId: number) =>
    api.get<Record<string, { division_code: string; division_name: string; total: number; per_sf: number }>>(`/budget/${projectId}/sf-analysis`),
  benchmarkComparison: (projectId: number) =>
    api.get<Record<string, { code: string; name: string; actual_pct: number; benchmark_pct: number; variance: number }>>(`/budget/${projectId}/benchmark-comparison`),
  calculateQuantity: (unitType: string, buildingId: number) =>
    api.post<{ quantity: number }>('/budget/calculate-quantity', {
      unit_type: unitType,
      building_id: buildingId,
    }),
};
