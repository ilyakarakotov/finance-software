import { api } from './client';

export interface Benchmark {
  benchmark_id: number;
  project_id?: number | null;
  code: string;
  name: string;
  benchmark_750k: number;
  benchmark_950k: number;
  benchmark_1500k: number;
  benchmark_average: number;
}

export interface BenchmarkCreate {
  project_id?: number | null;
  code: string;
  name: string;
  benchmark_750k: number;
  benchmark_950k: number;
  benchmark_1500k: number;
  benchmark_average: number;
}

export interface BenchmarkComparison {
  code: string;
  name: string;
  actual_amount: number;
  actual_pct: number;
  benchmark_pct: number;
  variance_pct: number;
  status: 'under' | 'over' | 'on_target';
}

export const benchmarksApi = {
  list: (projectId: number) =>
    api.get<Benchmark[]>(`/benchmarks?project_id=${projectId}`),
  seed: () => api.post<{ count: number }>('/benchmarks/seed', {}),
  update: (id: number, data: Partial<BenchmarkCreate>) =>
    api.put<Benchmark>(`/benchmarks/${id}`, data),
  getComparison: (projectId: number, buildingId: number) =>
    api.get<BenchmarkComparison[]>(`/benchmarks/${projectId}/comparison/${buildingId}`),
};
