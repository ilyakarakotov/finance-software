import { api } from './client';
import type { BCMapping, BCMappingCreate, BCSummary } from '../types/builders_capital';

export const buildersCapitalApi = {
  list: (projectId: number) =>
    api.get<BCMapping[]>(`/builders-capital?project_id=${projectId}`),
  create: (data: BCMappingCreate) => api.post<BCMapping>('/builders-capital', data),
  update: (id: number, data: Partial<BCMappingCreate>) =>
    api.put<BCMapping>(`/builders-capital/${id}`, data),
  delete: (id: number) => api.delete(`/builders-capital/${id}`),
  generate: (projectId: number) =>
    api.post<BCMapping[]>(`/builders-capital/${projectId}/generate`, {}),
  getSummary: (projectId: number) =>
    api.get<BCSummary[]>(`/builders-capital/${projectId}/summary`),
};
