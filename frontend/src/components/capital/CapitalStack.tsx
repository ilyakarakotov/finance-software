import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { capitalApi } from '../../api/capital';
import { cashflowApi } from '../../api/cashflow';
import type { CapitalStackTranche, CapitalStackTrancheCreate, PromoteTier, PromoteTierCreate } from '../../types/capital';
import type { ProjectMetrics } from '../../types/cashflow';
import CurrencyInput from '../shared/CurrencyInput';
import PercentInput from '../shared/PercentInput';
import MetricCard from '../shared/MetricCard';
import { formatCurrency, formatPercent, formatMultiple } from '../../utils/format';
import { projectsApi } from '../../api/projects';
import toast from 'react-hot-toast';
import { Plus, Trash2, RefreshCw, Layers, TrendingUp, ToggleLeft, ToggleRight } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const TRANCHE_COLORS: Record<string, string> = {
  equity: '#10b981',
  equity_gp: '#059669',
  equity_lp: '#34d399',
  mezz: '#f59e0b',
  senior: '#3b82f6',
  land_loan: '#8b5cf6',
};

const TRANCHE_LABELS: Record<string, string> = {
  equity: 'Equity (Combined)',
  equity_gp: 'GP Equity',
  equity_lp: 'LP Equity',
  mezz: 'Mezzanine',
  senior: 'Senior Debt',
  land_loan: 'Land Loan',
};

export default function CapitalStack() {
  const { projectId } = useParams<{ projectId: string }>();
  const pid = projectId ? parseInt(projectId) : null;
  const [tranches, setTranches] = useState<CapitalStackTranche[]>([]);
  const [tiers, setTiers] = useState<PromoteTier[]>([]);
  const [metrics, setMetrics] = useState<ProjectMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [recalculating, setRecalculating] = useState(false);
  const [useLtcRatio, setUseLtcRatio] = useState(false);
  const [ltcRatio, setLtcRatio] = useState<number>(0.9);

  const load = useCallback(async () => {
    if (!pid) return;
    try {
      setLoading(true);
      const [t, pt] = await Promise.all([
        capitalApi.listTranches(pid),
        capitalApi.listPromoteTiers(pid),
      ]);
      setTranches(t);
      setTiers(pt);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }, [pid]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (pid) {
      projectsApi.get(pid).then((p) => {
        setUseLtcRatio(p.use_ltc_ratio || false);
        setLtcRatio(p.ltc_ratio || 0.9);
      }).catch(() => {});
    }
  }, [pid]);

  const handleToggleLtc = async () => {
    if (!pid) return;
    const newVal = !useLtcRatio;
    setUseLtcRatio(newVal);
    try {
      await projectsApi.update(pid, { use_ltc_ratio: newVal, ltc_ratio: ltcRatio });
      if (newVal && metrics) {
        // Auto-derive: senior = devCost * ltcRatio, equity = devCost * (1-ltcRatio)
        const devCost = metrics.total_development_cost;
        const seniorAmount = devCost * ltcRatio;
        const equityAmount = devCost * (1 - ltcRatio);
        const seniorTranche = tranches.find((t) => t.type === 'senior');
        const equityTranche = tranches.find((t) => t.type === 'equity');
        if (seniorTranche) await capitalApi.updateTranche(seniorTranche.tranche_id, { committed_amount: Math.round(seniorAmount * 100) / 100 });
        if (equityTranche) await capitalApi.updateTranche(equityTranche.tranche_id, { committed_amount: Math.round(equityAmount * 100) / 100 });
        toast.success('Capital amounts derived from LTC ratio');
        load();
      }
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleLtcRatioChange = async (val: number) => {
    if (!pid) return;
    setLtcRatio(val);
    try {
      await projectsApi.update(pid, { ltc_ratio: val });
      if (useLtcRatio && metrics) {
        const devCost = metrics.total_development_cost;
        const seniorAmount = devCost * val;
        const equityAmount = devCost * (1 - val);
        const seniorTranche = tranches.find((t) => t.type === 'senior');
        const equityTranche = tranches.find((t) => t.type === 'equity');
        if (seniorTranche) await capitalApi.updateTranche(seniorTranche.tranche_id, { committed_amount: Math.round(seniorAmount * 100) / 100 });
        if (equityTranche) await capitalApi.updateTranche(equityTranche.tranche_id, { committed_amount: Math.round(equityAmount * 100) / 100 });
        load();
      }
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const loadTranches = useCallback(async () => {
    if (!pid) return;
    try {
      const t = await capitalApi.listTranches(pid);
      setTranches(t);
    } catch (err: any) {
      toast.error(err.message);
    }
  }, [pid]);

  const loadPromoteTiers = useCallback(async () => {
    if (!pid) return;
    try {
      const pt = await capitalApi.listPromoteTiers(pid);
      setTiers(pt);
    } catch (err: any) {
      toast.error(err.message);
    }
  }, [pid]);

  const handleInitializeCapital = async () => {
    if (!pid) return;
    try {
      await projectsApi.initializeCapital(pid);
      toast.success('Capital stack initialized from project defaults');
      loadTranches();
      loadPromoteTiers();
    } catch (e) {
      toast.error('Failed to initialize capital stack');
    }
  };

  const handleRecalc = async () => {
    if (!pid) return;
    try {
      setRecalculating(true);
      const result = await cashflowApi.recalculate(pid);
      setMetrics(result.metrics);
      toast.success('Recalculation complete');
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setRecalculating(false);
    }
  };

  const handleAddTranche = async (type: string) => {
    if (!pid) return;
    try {
      const data: CapitalStackTrancheCreate = {
        project_id: pid,
        type: type as any,
        committed_amount: 0,
        interest_rate: 0,
        origination_fee_pct: 0,
        gp_equity_pct: type === 'equity' ? 0.59 : 0,
        lp_equity_pct: type === 'equity' ? 0.41 : 0,
        preferred_return_rate: 0,
        loan_release_pct: type === 'senior' ? 1.0 : 0,
      };
      await capitalApi.createTranche(data);
      toast.success('Tranche added');
      load();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleUpdateTranche = async (id: number, field: string, value: any) => {
    try {
      await capitalApi.updateTranche(id, { [field]: value });
      load();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleDeleteTranche = async (id: number) => {
    try {
      await capitalApi.deleteTranche(id);
      toast.success('Tranche deleted');
      load();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleAddTier = async () => {
    if (!pid) return;
    try {
      const data: PromoteTierCreate = {
        project_id: pid,
        sequence: tiers.length,
        hurdle_rate: 0,
        gp_split: 0.5,
        lp_split: 0.5,
      };
      await capitalApi.createPromoteTier(data);
      toast.success('Promote tier added');
      load();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleUpdateTier = async (id: number, field: string, value: any) => {
    try {
      await capitalApi.updatePromoteTier(id, { [field]: value });
      load();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleDeleteTier = async (id: number) => {
    try {
      await capitalApi.deletePromoteTier(id);
      toast.success('Tier deleted');
      load();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  // Chart data
  const chartData = tranches.map((t) => ({
    name: TRANCHE_LABELS[t.type] || t.type,
    amount: t.committed_amount,
    color: TRANCHE_COLORS[t.type] || '#6b7280',
  }));

  if (loading) {
    return <div className="flex items-center justify-center h-64 text-slate-400">Loading capital stack...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
          <Layers size={20} /> Capital Stack
        </h2>
        <div className="flex gap-2">
          <button
            onClick={handleInitializeCapital}
            className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded text-sm font-medium transition-colors"
          >
            Initialize from Project Defaults
          </button>
          <button
            onClick={handleRecalc}
            disabled={recalculating}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded text-sm font-medium transition-colors disabled:opacity-50"
          >
            <RefreshCw size={16} className={recalculating ? 'animate-spin' : ''} />
            {recalculating ? 'Recalculating...' : 'Recalculate'}
          </button>
        </div>
      </div>

      {/* LTC Ratio Toggle - Change 8 */}
      <div className="bg-navy-800/50 border border-navy-700 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={handleToggleLtc} className="text-slate-300 hover:text-white">
              {useLtcRatio ? <ToggleRight size={28} className="text-emerald-400" /> : <ToggleLeft size={28} />}
            </button>
            <span className="text-sm text-slate-300">Calculate from LTC Ratio</span>
          </div>
          {useLtcRatio && (
            <div className="flex items-center gap-2">
              <label className="text-xs text-slate-400">LTC Ratio</label>
              <PercentInput
                value={ltcRatio}
                onChange={handleLtcRatioChange}
                className="text-xs w-20"
              />
              {metrics && (
                <span className="text-xs text-slate-500 ml-2">
                  Senior: {formatCurrency(metrics.total_development_cost * ltcRatio)} | Equity: {formatCurrency(metrics.total_development_cost * (1 - ltcRatio))}
                </span>
              )}
            </div>
          )}
        </div>
        {useLtcRatio && (
          <p className="text-xs text-slate-500 mt-2">Equity and senior debt amounts are derived from total development cost × LTC ratio. Recalculate after toggling.</p>
        )}
      </div>

      {/* Metrics cards */}
      {metrics && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <MetricCard label="LTC Ratio" value={formatPercent(metrics.ltc_ratio)} color="blue" />
          <MetricCard label="Peak Equity" value={formatCurrency(metrics.peak_equity)} color="green" />
          <MetricCard label="Peak Debt Balance" value={formatCurrency(metrics.peak_debt_balance)} color="red" />
          <MetricCard label="Total Financing Cost" value={formatCurrency(metrics.total_financing_cost)} color="amber" />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Visual stacked bar */}
        <div className="bg-navy-800/50 border border-navy-700 rounded-lg p-4">
          <h3 className="text-sm font-medium text-slate-300 mb-4">Capital Structure</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={chartData} layout="vertical">
              <XAxis type="number" tickFormatter={(v) => `$${(v / 1e6).toFixed(1)}M`} stroke="#64748b" fontSize={11} />
              <YAxis type="category" dataKey="name" stroke="#64748b" fontSize={11} width={100} />
              <Tooltip
                formatter={(value: number) => formatCurrency(value)}
                contentStyle={{ backgroundColor: '#1a2846', border: '1px solid #34508c', borderRadius: '4px' }}
                labelStyle={{ color: '#e2e8f0' }}
              />
              <Bar dataKey="amount" radius={[0, 4, 4, 0]}>
                {chartData.map((entry, index) => (
                  <Cell key={index} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Tranche inputs */}
        <div className="bg-navy-800/50 border border-navy-700 rounded-lg p-4">
          <h3 className="text-sm font-medium text-slate-300 mb-4">Tranches</h3>
          <div className="space-y-3">
            {tranches.map((t) => (
              <div key={t.tranche_id} className="bg-navy-900/50 rounded-lg p-3 border border-navy-700">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: TRANCHE_COLORS[t.type] || '#6b7280' }} />
                    <span className="text-sm text-white font-medium">{TRANCHE_LABELS[t.type] || t.type}</span>
                  </div>
                  <button onClick={() => handleDeleteTranche(t.tranche_id)} className="text-red-400 hover:text-red-300">
                    <Trash2 size={12} />
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs text-slate-400 mb-0.5">Committed Amount</label>
                    <CurrencyInput
                      value={t.committed_amount}
                      onChange={(v) => handleUpdateTranche(t.tranche_id, 'committed_amount', v)}
                      className="text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-0.5">Interest Rate</label>
                    <PercentInput
                      value={t.interest_rate}
                      onChange={(v) => handleUpdateTranche(t.tranche_id, 'interest_rate', v)}
                      className="text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-0.5">Origination Fee</label>
                    <PercentInput
                      value={t.origination_fee_pct}
                      onChange={(v) => handleUpdateTranche(t.tranche_id, 'origination_fee_pct', v)}
                      className="text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-0.5">Release %</label>
                    <PercentInput
                      value={t.loan_release_pct}
                      onChange={(v) => handleUpdateTranche(t.tranche_id, 'loan_release_pct', v)}
                      className="text-xs"
                    />
                  </div>
                  {t.type.includes('equity') && (
                    <>
                      <div>
                        <label className="block text-xs text-slate-400 mb-0.5">GP Equity %</label>
                        <PercentInput
                          value={t.gp_equity_pct}
                          onChange={(v) => handleUpdateTranche(t.tranche_id, 'gp_equity_pct', v)}
                          className="text-xs"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-slate-400 mb-0.5">LP Equity %</label>
                        <PercentInput
                          value={t.lp_equity_pct}
                          onChange={(v) => handleUpdateTranche(t.tranche_id, 'lp_equity_pct', v)}
                          className="text-xs"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-slate-400 mb-0.5">Preferred Return</label>
                        <PercentInput
                          value={t.preferred_return_rate}
                          onChange={(v) => handleUpdateTranche(t.tranche_id, 'preferred_return_rate', v)}
                          className="text-xs"
                        />
                      </div>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
          <div className="flex gap-2 mt-3">
            <button onClick={() => handleAddTranche('equity')} className="bg-emerald-600/20 text-emerald-400 text-xs px-2 py-1 rounded hover:bg-emerald-600/30">+ Equity</button>
            <button onClick={() => handleAddTranche('senior')} className="bg-blue-600/20 text-blue-400 text-xs px-2 py-1 rounded hover:bg-blue-600/30">+ Senior</button>
            <button onClick={() => handleAddTranche('mezz')} className="bg-amber-600/20 text-amber-400 text-xs px-2 py-1 rounded hover:bg-amber-600/30">+ Mezz</button>
            <button onClick={() => handleAddTranche('land_loan')} className="bg-purple-600/20 text-purple-400 text-xs px-2 py-1 rounded hover:bg-purple-600/30">+ Land Loan</button>
          </div>
        </div>
      </div>

      {/* Promote Structure */}
      <div className="bg-navy-800/50 border border-navy-700 rounded-lg p-6">
        <h3 className="text-sm font-medium text-slate-300 mb-4 flex items-center gap-2">
          <TrendingUp size={16} /> Promote Structure
        </h3>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-slate-400 text-xs uppercase tracking-wider border-b border-navy-700">
              <th className="text-left py-2 px-3">Tier</th>
              <th className="text-right py-2 px-3">Hurdle Rate</th>
              <th className="text-right py-2 px-3">GP Split</th>
              <th className="text-right py-2 px-3">LP Split</th>
              <th className="text-center py-2 px-3 w-8"></th>
            </tr>
          </thead>
          <tbody>
            {tiers.map((tier) => (
              <tr key={tier.tier_id} className="border-b border-navy-800/50">
                <td className="py-2 px-3 text-white">
                  {tier.sequence === 0 ? 'Preferred' : `Tier ${tier.sequence}`}
                </td>
                <td className="py-2 px-3">
                  <PercentInput
                    value={tier.hurdle_rate}
                    onChange={(v) => handleUpdateTier(tier.tier_id, 'hurdle_rate', v)}
                    className="text-xs w-24 ml-auto"
                  />
                </td>
                <td className="py-2 px-3">
                  <PercentInput
                    value={tier.gp_split}
                    onChange={(v) => handleUpdateTier(tier.tier_id, 'gp_split', v)}
                    className="text-xs w-24 ml-auto"
                  />
                </td>
                <td className="py-2 px-3">
                  <PercentInput
                    value={tier.lp_split}
                    onChange={(v) => handleUpdateTier(tier.tier_id, 'lp_split', v)}
                    className="text-xs w-24 ml-auto"
                  />
                </td>
                <td className="py-2 px-3 text-center">
                  <button onClick={() => handleDeleteTier(tier.tier_id)} className="text-red-400 hover:text-red-300">
                    <Trash2 size={12} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <button
          onClick={handleAddTier}
          className="flex items-center gap-1 mt-3 text-blue-400 hover:text-blue-300 text-sm"
        >
          <Plus size={14} /> Add Tier
        </button>
      </div>
    </div>
  );
}
