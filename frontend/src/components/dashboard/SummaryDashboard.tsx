import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useCalcEngine } from '../../hooks/useCalcEngine';
import { cashflowApi } from '../../api/cashflow';
import type { PricingAnalysis } from '../../types/cashflow';
import MetricCard from '../shared/MetricCard';
import { formatCurrency, formatPercent, formatMultiple } from '../../utils/format';
import { RefreshCw, TrendingUp, DollarSign, BarChart3, PieChart, Crosshair } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, Legend,
  PieChart as RechartsPie, Pie,
} from 'recharts';

const PIE_COLORS = ['#059669', '#34d399', '#3b82f6', '#f59e0b', '#8b5cf6'];

export default function SummaryDashboard() {
  const { projectId } = useParams<{ projectId: string }>();
  const pid = projectId ? parseInt(projectId) : null;
  const { metrics, sensitivity, recalculating, recalculate, loadMetrics, loadSensitivity } = useCalcEngine(pid);

  const [pricingAnalysis, setPricingAnalysis] = useState<PricingAnalysis | null>(null);

  useEffect(() => {
    loadMetrics();
  }, [loadMetrics]);

  useEffect(() => {
    if (pid && metrics) {
      cashflowApi.getPricingAnalysis(pid).then(setPricingAnalysis).catch(() => {});
    }
  }, [pid, metrics]);

  const handleLoadSensitivity = () => {
    loadSensitivity();
  };

  // Sources & Uses data
  const sourcesData = metrics ? [
    { name: 'GP Equity', value: metrics.gp_equity, color: '#059669' },
    { name: 'LP Equity', value: metrics.lp_equity, color: '#34d399' },
    { name: 'Senior Debt', value: metrics.senior_debt_committed, color: '#3b82f6' },
  ].filter(d => d.value > 0) : [];

  const usesData = metrics ? [
    { name: 'Development Cost', value: metrics.total_development_cost, color: '#ef4444' },
    { name: 'Financing Cost', value: metrics.total_financing_cost, color: '#f59e0b' },
    { name: 'Cost of Sale', value: metrics.total_cost_of_sale, color: '#f97316' },
  ].filter(d => d.value > 0) : [];

  // GP vs LP comparison
  const gpLpData = metrics && metrics.waterfall ? [
    {
      name: 'GP',
      'Return of Capital': metrics.waterfall.gp_return_of_capital,
      'Preferred Return': metrics.waterfall.gp_preferred_return,
      'Promote': Object.values(metrics.waterfall.gp_promote_by_tier).reduce((a, b) => a + b, 0),
    },
    {
      name: 'LP',
      'Return of Capital': metrics.waterfall.lp_return_of_capital,
      'Preferred Return': metrics.waterfall.lp_preferred_return,
      'Promote': Object.values(metrics.waterfall.lp_promote_by_tier).reduce((a, b) => a + b, 0),
    },
  ] : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
          <BarChart3 size={20} /> Project Summary
        </h2>
        <button
          onClick={recalculate}
          disabled={recalculating}
          className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded text-sm font-medium transition-colors disabled:opacity-50"
        >
          <RefreshCw size={16} className={recalculating ? 'animate-spin' : ''} />
          {recalculating ? 'Recalculating...' : 'Recalculate'}
        </button>
      </div>

      {/* Key metrics cards */}
      {metrics && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            <MetricCard label="Total Dev Cost" value={formatCurrency(metrics.total_development_cost)} color="red" />
            <MetricCard label="Total Revenue" value={formatCurrency(metrics.total_revenue)} color="green" />
            <MetricCard label="Project Profit" value={formatCurrency(metrics.project_profit)} color="green" />
            <MetricCard label="Profit Margin" value={formatPercent(metrics.profit_margin)} color="default" />
            <MetricCard label="Levered XIRR" value={formatPercent(metrics.levered_xirr, 2)} color="amber" />
            <MetricCard label="Equity Multiple" value={formatMultiple(metrics.equity_multiple)} color="blue" />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <MetricCard label="Unlevered XIRR" value={formatPercent(metrics.unlevered_xirr, 2)} />
            <MetricCard label="GP XIRR" value={formatPercent(metrics.gp_xirr, 2)} color="green" />
            <MetricCard label="LP XIRR" value={formatPercent(metrics.lp_xirr, 2)} color="blue" />
            <MetricCard label="Senior Interest" value={formatCurrency(metrics.senior_interest)} color="red" />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <MetricCard label="GP Equity" value={formatCurrency(metrics.gp_equity)} color="green" />
            <MetricCard label="LP Equity" value={formatCurrency(metrics.lp_equity)} color="blue" />
            <MetricCard label="GP Multiple" value={formatMultiple(metrics.gp_multiple)} color="green" />
            <MetricCard label="LP Multiple" value={formatMultiple(metrics.lp_multiple)} color="blue" />
          </div>

          {/* Sources & Uses */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-navy-800/50 border border-navy-700 rounded-lg p-4">
              <h3 className="text-sm font-medium text-slate-300 mb-4 flex items-center gap-2">
                <DollarSign size={16} /> Sources of Capital
              </h3>
              <ResponsiveContainer width="100%" height={200}>
                <RechartsPie>
                  <Pie
                    data={sourcesData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label={({ name, value }) => `${name}: ${formatCurrency(value)}`}
                  >
                    {sourcesData.map((entry, index) => (
                      <Cell key={index} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number) => formatCurrency(value)}
                    contentStyle={{ backgroundColor: '#1a2846', border: '1px solid #34508c', borderRadius: '4px' }}
                  />
                </RechartsPie>
              </ResponsiveContainer>
              <div className="mt-2 space-y-1">
                {sourcesData.map((s) => (
                  <div key={s.name} className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: s.color }} />
                      <span className="text-slate-300">{s.name}</span>
                    </span>
                    <span className="font-financial text-white">{formatCurrency(s.value)}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-navy-800/50 border border-navy-700 rounded-lg p-4">
              <h3 className="text-sm font-medium text-slate-300 mb-4 flex items-center gap-2">
                <PieChart size={16} /> Uses of Capital
              </h3>
              <ResponsiveContainer width="100%" height={200}>
                <RechartsPie>
                  <Pie
                    data={usesData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label={({ name, value }) => `${name}: ${formatCurrency(value)}`}
                  >
                    {usesData.map((entry, index) => (
                      <Cell key={index} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number) => formatCurrency(value)}
                    contentStyle={{ backgroundColor: '#1a2846', border: '1px solid #34508c', borderRadius: '4px' }}
                  />
                </RechartsPie>
              </ResponsiveContainer>
              <div className="mt-2 space-y-1">
                {usesData.map((u) => (
                  <div key={u.name} className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: u.color }} />
                      <span className="text-slate-300">{u.name}</span>
                    </span>
                    <span className="font-financial text-white">{formatCurrency(u.value)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* GP vs LP Waterfall */}
          {metrics.waterfall && gpLpData.length > 0 && (
            <div className="bg-navy-800/50 border border-navy-700 rounded-lg p-4">
              <h3 className="text-sm font-medium text-slate-300 mb-4 flex items-center gap-2">
                <TrendingUp size={16} /> Equity Waterfall — GP vs LP
              </h3>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={gpLpData}>
                  <XAxis dataKey="name" stroke="#64748b" fontSize={12} />
                  <YAxis tickFormatter={(v) => `$${(v / 1e6).toFixed(1)}M`} stroke="#64748b" fontSize={11} />
                  <Tooltip
                    formatter={(value: number) => formatCurrency(value)}
                    contentStyle={{ backgroundColor: '#1a2846', border: '1px solid #34508c', borderRadius: '4px' }}
                    labelStyle={{ color: '#e2e8f0' }}
                  />
                  <Legend />
                  <Bar dataKey="Return of Capital" stackId="a" fill="#6b7280" />
                  <Bar dataKey="Preferred Return" stackId="a" fill="#f59e0b" />
                  <Bar dataKey="Promote" stackId="a" fill="#10b981" />
                </BarChart>
              </ResponsiveContainer>

              {/* Waterfall detail table */}
              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-slate-400 border-b border-navy-700">
                      <th className="text-left py-1 px-3">Component</th>
                      <th className="text-right py-1 px-3">GP</th>
                      <th className="text-right py-1 px-3">LP</th>
                      <th className="text-right py-1 px-3">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-navy-800/50">
                      <td className="py-1 px-3 text-slate-300">Return of Capital</td>
                      <td className="py-1 px-3 text-right font-financial text-white">{formatCurrency(metrics.waterfall.gp_return_of_capital)}</td>
                      <td className="py-1 px-3 text-right font-financial text-white">{formatCurrency(metrics.waterfall.lp_return_of_capital)}</td>
                      <td className="py-1 px-3 text-right font-financial text-white">{formatCurrency(metrics.waterfall.gp_return_of_capital + metrics.waterfall.lp_return_of_capital)}</td>
                    </tr>
                    <tr className="border-b border-navy-800/50">
                      <td className="py-1 px-3 text-slate-300">Preferred Return</td>
                      <td className="py-1 px-3 text-right font-financial text-white">{formatCurrency(metrics.waterfall.gp_preferred_return)}</td>
                      <td className="py-1 px-3 text-right font-financial text-white">{formatCurrency(metrics.waterfall.lp_preferred_return)}</td>
                      <td className="py-1 px-3 text-right font-financial text-white">{formatCurrency(metrics.waterfall.gp_preferred_return + metrics.waterfall.lp_preferred_return)}</td>
                    </tr>
                    {Object.keys(metrics.waterfall.gp_promote_by_tier).map((tierKey) => (
                      <tr key={tierKey} className="border-b border-navy-800/50">
                        <td className="py-1 px-3 text-slate-300">Promote Tier {tierKey}</td>
                        <td className="py-1 px-3 text-right font-financial text-white">{formatCurrency(metrics.waterfall!.gp_promote_by_tier[tierKey])}</td>
                        <td className="py-1 px-3 text-right font-financial text-white">{formatCurrency(metrics.waterfall!.lp_promote_by_tier[tierKey])}</td>
                        <td className="py-1 px-3 text-right font-financial text-white">{formatCurrency(metrics.waterfall!.gp_promote_by_tier[tierKey] + metrics.waterfall!.lp_promote_by_tier[tierKey])}</td>
                      </tr>
                    ))}
                    <tr className="bg-navy-700/30 font-medium">
                      <td className="py-1.5 px-3 text-white">Total</td>
                      <td className="py-1.5 px-3 text-right font-financial text-emerald-400">{formatCurrency(metrics.waterfall.total_gp)}</td>
                      <td className="py-1.5 px-3 text-right font-financial text-blue-400">{formatCurrency(metrics.waterfall.total_lp)}</td>
                      <td className="py-1.5 px-3 text-right font-financial text-white">{formatCurrency(metrics.waterfall.total_gp + metrics.waterfall.total_lp)}</td>
                    </tr>
                    <tr className="bg-navy-700/30">
                      <td className="py-1.5 px-3 text-slate-300">Multiple</td>
                      <td className="py-1.5 px-3 text-right font-financial text-emerald-400">{formatMultiple(metrics.waterfall.gp_multiple)}</td>
                      <td className="py-1.5 px-3 text-right font-financial text-blue-400">{formatMultiple(metrics.waterfall.lp_multiple)}</td>
                      <td className="py-1.5 px-3 text-right font-financial text-white">{formatMultiple(metrics.equity_multiple)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Pricing Analysis - Change 7 */}
          {pricingAnalysis && (
            <div className="bg-navy-800/50 border border-navy-700 rounded-lg p-4">
              <h3 className="text-sm font-medium text-slate-300 mb-4 flex items-center gap-2">
                <Crosshair size={16} /> Pricing Analysis
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                <div className="bg-navy-900/50 rounded-lg p-3">
                  <div className="text-xs text-slate-400">Break-Even $/SF</div>
                  <div className="text-lg font-financial text-red-400 font-semibold">{formatCurrency(pricingAnalysis.break_even_psf)}</div>
                </div>
                <div className="bg-navy-900/50 rounded-lg p-3">
                  <div className="text-xs text-slate-400">Current Avg $/SF</div>
                  <div className="text-lg font-financial text-white font-semibold">{formatCurrency(pricingAnalysis.current_avg_psf)}</div>
                </div>
                <div className="bg-navy-900/50 rounded-lg p-3">
                  <div className="text-xs text-slate-400">Margin Above Break-Even</div>
                  <div className={`text-lg font-financial font-semibold ${pricingAnalysis.margin_above_break_even > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {formatPercent(pricingAnalysis.margin_above_break_even)}
                  </div>
                </div>
                <div className="bg-navy-900/50 rounded-lg p-3">
                  <div className="text-xs text-slate-400">$/SF for 20% Margin</div>
                  <div className="text-lg font-financial text-amber-400 font-semibold">{formatCurrency(pricingAnalysis.psf_for_20pct_margin)}</div>
                </div>
                <div className="bg-navy-900/50 rounded-lg p-3">
                  <div className="text-xs text-slate-400">$/SF for 3.0x Multiple</div>
                  <div className="text-lg font-financial text-blue-400 font-semibold">{formatCurrency(pricingAnalysis.psf_for_3x_multiple)}</div>
                </div>
              </div>
            </div>
          )}

          {/* Sensitivity Table */}
          <div className="bg-navy-800/50 border border-navy-700 rounded-lg p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-slate-300">Sensitivity Analysis — Sale Price PSF vs Construction Cost PSF</h3>
              <button
                onClick={handleLoadSensitivity}
                className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded"
              >
                Run Sensitivity
              </button>
            </div>

            {sensitivity ? (
              <div className="overflow-x-auto">
                <table className="text-xs border-collapse">
                  <thead>
                    <tr>
                      <th className="py-1 px-2 text-slate-400 border-r border-b border-navy-700">Sale PSF \ Cost PSF</th>
                      {sensitivity.construction_cost_psf_values.map((v, i) => (
                        <th key={i} className="py-1 px-2 text-center text-slate-400 border-r border-b border-navy-700 font-financial">
                          ${v.toFixed(0)}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {sensitivity.cells.map((row, ri) => (
                      <tr key={ri}>
                        <td className="py-1 px-2 text-slate-400 font-financial border-r border-b border-navy-700">
                          ${sensitivity.sale_price_psf_values[ri]?.toFixed(0)}
                        </td>
                        {row.map((cell, ci) => {
                          const profitColor = cell.project_profit > 0 ? 'text-emerald-300' : 'text-red-300';
                          return (
                            <td key={ci} className="py-1 px-2 text-center border-r border-b border-navy-800/50">
                              <div className={`font-financial ${profitColor}`}>{formatCurrency(cell.project_profit)}</div>
                              <div className="text-[10px] text-slate-500 font-financial">
                                {cell.xirr != null ? formatPercent(cell.xirr, 1) : '—'}
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-xs text-slate-500">Click "Run Sensitivity" to compute a 5×5 grid of scenarios.</p>
            )}
          </div>
        </>
      )}

      {!metrics && (
        <div className="text-center text-slate-400 py-16">
          <p>No metrics available. Click Recalculate to compute project metrics.</p>
        </div>
      )}
    </div>
  );
}
