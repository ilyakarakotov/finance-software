import { api } from './client';
import type { LoanDraw, LoanDrawCreate, LoanDrawPeriod, LoanDrawSummary } from '../types/loan_draw';

export const loanDrawsApi = {
  list: (projectId: number) => api.get<LoanDraw[]>(`/loan-draws?project_id=${projectId}`),
  getSchedule: (projectId: number) =>
    api.get<LoanDraw[]>(`/loan-draws/${projectId}/schedule`),
  create: (data: LoanDrawCreate) => api.post<LoanDraw>('/loan-draws', data),
  update: (id: number, data: Partial<LoanDrawCreate>) =>
    api.put<LoanDraw>(`/loan-draws/${id}`, data),
  delete: (id: number) => api.delete(`/loan-draws/${id}`),
  addPeriod: (drawId: number, period: Omit<LoanDrawPeriod, 'period_id' | 'loan_draw_id'>) =>
    api.post<LoanDrawPeriod>(`/loan-draws/${drawId}/periods`, period),
  updatePeriod: (periodId: number, data: Partial<LoanDrawPeriod>) =>
    api.put<LoanDrawPeriod>(`/loan-draws/periods/${periodId}`, data),
  generateFromBudget: (projectId: number) =>
    api.post<LoanDraw[]>(`/loan-draws/${projectId}/generate-from-budget`, {}),
  getSummary: (projectId: number) =>
    api.get<LoanDrawSummary[]>(`/loan-draws/${projectId}/summary`),
};
