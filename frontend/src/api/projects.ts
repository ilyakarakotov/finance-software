import { api } from './client';
import type { Project, ProjectDetail, ProjectCreate, Phase, PhaseCreate, Building, BuildingCreate, BuildingUpdate, Unit } from '../types/project';

export const projectsApi = {
  list: () => api.get<Project[]>('/projects/'),
  get: (id: number) => api.get<ProjectDetail>(`/projects/${id}`),
  create: (data: ProjectCreate) => api.post<Project>('/projects/', data),
  update: (id: number, data: Partial<ProjectCreate>) => api.put<Project>(`/projects/${id}`, data),
  delete: (id: number) => api.delete(`/projects/${id}`),

  // Phases
  listPhases: (projectId: number) => api.get<Phase[]>(`/projects/${projectId}/phases`),
  createPhase: (projectId: number, data: PhaseCreate) =>
    api.post<Phase>(`/projects/${projectId}/phases`, data),
  deletePhase: (phaseId: number) => api.delete(`/projects/phases/${phaseId}`),

  // Buildings
  createBuilding: (data: BuildingCreate) => api.post<Building>('/projects/buildings', data),
  updateBuilding: (buildingId: number, data: BuildingUpdate) =>
    api.put<Building>(`/projects/buildings/${buildingId}`, data),
  deleteBuilding: (buildingId: number) => api.delete(`/projects/buildings/${buildingId}`),

  // Units
  listUnits: (projectId: number) => api.get<Unit[]>(`/projects/${projectId}/units`),
  updateUnit: (unitId: number, data: Partial<Unit>) => api.put<Unit>(`/projects/units/${unitId}`, data),
  bulkUpdateUnits: (projectId: number, updates: Array<Partial<Unit> & { unit_id: number }>) =>
    api.put<Unit[]>(`/projects/${projectId}/units/bulk`, updates),

  // Capital
  initializeCapital: (projectId: number) =>
    api.post(`/projects/${projectId}/initialize-capital`, {}),
};
