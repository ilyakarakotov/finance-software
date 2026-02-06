import { api } from './client';
import type {
  MonthlyCashflow, ProjectMetrics, RecalcResponse, SensitivityGrid,
  PriceSolverRequest, PriceSolverResponse, PricingAnalysis,
} from '../types/cashflow';

export const cashflowApi = {
  recalculate: (projectId: number) =>
    api.post<RecalcResponse>(`/cashflow/${projectId}/recalc`, {}),
  getCashflows: (projectId: number) =>
    api.get<MonthlyCashflow[]>(`/cashflow/${projectId}`),
  getMetrics: (projectId: number) =>
    api.get<ProjectMetrics>(`/cashflow/${projectId}/metrics`),
  getSensitivity: (projectId: number) =>
    api.get<SensitivityGrid>(`/cashflow/${projectId}/sensitivity`),
  getPricingAnalysis: (projectId: number) =>
    api.get<PricingAnalysis>(`/cashflow/${projectId}/pricing-analysis`),
  solvePrice: (projectId: number, data: PriceSolverRequest) =>
    api.post<PriceSolverResponse>(`/cashflow/${projectId}/solve-price`, data),
};
