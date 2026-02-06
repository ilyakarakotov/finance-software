import { useState, useCallback } from 'react';
import { cashflowApi } from '../api/cashflow';
import type { MonthlyCashflow, ProjectMetrics, SensitivityGrid } from '../types/cashflow';
import toast from 'react-hot-toast';

export function useCalcEngine(projectId: number | null) {
  const [cashflows, setCashflows] = useState<MonthlyCashflow[]>([]);
  const [metrics, setMetrics] = useState<ProjectMetrics | null>(null);
  const [sensitivity, setSensitivity] = useState<SensitivityGrid | null>(null);
  const [loading, setLoading] = useState(false);
  const [recalculating, setRecalculating] = useState(false);

  const recalculate = useCallback(async () => {
    if (!projectId) return;
    try {
      setRecalculating(true);
      const result = await cashflowApi.recalculate(projectId);
      setCashflows(result.cashflows);
      setMetrics(result.metrics);
      toast.success('Recalculation complete');
    } catch (err: any) {
      toast.error(err.message || 'Recalculation failed');
    } finally {
      setRecalculating(false);
    }
  }, [projectId]);

  const loadCashflows = useCallback(async () => {
    if (!projectId) return;
    try {
      setLoading(true);
      const data = await cashflowApi.getCashflows(projectId);
      setCashflows(data);
    } catch (err: any) {
      toast.error(err.message || 'Failed to load cashflows');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  const loadMetrics = useCallback(async () => {
    if (!projectId) return;
    try {
      const data = await cashflowApi.getMetrics(projectId);
      setMetrics(data);
    } catch (err: any) {
      toast.error(err.message || 'Failed to load metrics');
    }
  }, [projectId]);

  const loadSensitivity = useCallback(async () => {
    if (!projectId) return;
    try {
      setLoading(true);
      const data = await cashflowApi.getSensitivity(projectId);
      setSensitivity(data);
    } catch (err: any) {
      toast.error(err.message || 'Failed to load sensitivity');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  return {
    cashflows,
    metrics,
    sensitivity,
    loading,
    recalculating,
    recalculate,
    loadCashflows,
    loadMetrics,
    loadSensitivity,
  };
}
