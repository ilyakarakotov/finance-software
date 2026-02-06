import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { projectsApi } from '../../api/projects';
import { cashflowApi } from '../../api/cashflow';
import type { Unit, Building, ProjectDetail } from '../../types/project';
import type { PriceSolverResponse } from '../../types/cashflow';
import CurrencyInput from '../shared/CurrencyInput';
import { formatCurrency } from '../../utils/format';
import toast from 'react-hot-toast';
import { RefreshCw, ShoppingCart, Target, Check } from 'lucide-react';

export default function SalesSchedule() {
  const { projectId } = useParams<{ projectId: string }>();
  const pid = projectId ? parseInt(projectId) : null;
  const [units, setUnits] = useState<Unit[]>([]);
  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [recalculating, setRecalculating] = useState(false);

  // Bulk $/PSF state
  const [bulkBuildingId, setBulkBuildingId] = useState<number>(0);
  const [bulkPsf, setBulkPsf] = useState<string>('');

  // Reverse price solver state
  const [showSolver, setShowSolver] = useState(false);
  const [solverMetric, setSolverMetric] = useState<'profit_margin' | 'equity_multiple' | 'levered_irr'>('profit_margin');
  const [solverValue, setSolverValue] = useState<string>('0.20');
  const [solverMode, setSolverMode] = useState<'uniform' | 'proportional'>('uniform');
  const [solverResult, setSolverResult] = useState<PriceSolverResponse | null>(null);
  const [solving, setSolving] = useState(false);

  const load = useCallback(async () => {
    if (!pid) return;
    try {
      setLoading(true);
      const [unitData, projData] = await Promise.all([
        projectsApi.listUnits(pid),
        projectsApi.get(pid),
      ]);
      setUnits(unitData);
      setProject(projData);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }, [pid]);

  useEffect(() => { load(); }, [load]);

  const handleUpdate = async (unitId: number, field: string, value: any) => {
    try {
      await projectsApi.updateUnit(unitId, { [field]: value });
      load();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handlePsfChange = async (unitId: number, psf: number, sf: number) => {
    const newPrice = Math.round(psf * sf / 10000) * 10000;
    try {
      await projectsApi.updateUnit(unitId, { sale_price: newPrice, price_per_sf: psf });
      load();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleBulkSetPsf = async () => {
    if (!pid || !bulkBuildingId || !bulkPsf) return;
    const psf = parseFloat(bulkPsf);
    if (isNaN(psf) || psf <= 0) return;
    try {
      const buildingUnits = units.filter((u) => u.building_id === bulkBuildingId);
      const updates = buildingUnits.map((u) => ({
        unit_id: u.unit_id,
        sale_price: Math.round(psf * (u.sf || 0) / 10000) * 10000,
        price_per_sf: psf,
      }));
      await projectsApi.bulkUpdateUnits(pid, updates);
      toast.success(`Set $/PSF for ${buildingUnits.length} units`);
      load();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleSolve = async () => {
    if (!pid) return;
    try {
      setSolving(true);
      const result = await cashflowApi.solvePrice(pid, {
        target_metric: solverMetric,
        target_value: parseFloat(solverValue),
        distribution_mode: solverMode,
      });
      setSolverResult(result);
    } catch (err: any) {
      toast.error(err.message || 'Solver failed');
    } finally {
      setSolving(false);
    }
  };

  const handleApplySolverPrices = async () => {
    if (!pid || !solverResult) return;
    try {
      const updates = units.map((u) => {
        const bldgSuggestion = solverResult.building_suggestions.find(
          (b) => b.building_id === u.building_id
        );
        const psf = bldgSuggestion?.suggested_psf || solverResult.required_avg_psf;
        return {
          unit_id: u.unit_id,
          sale_price: Math.round(psf * (u.sf || 0) / 10000) * 10000,
          price_per_sf: psf,
        };
      });
      await projectsApi.bulkUpdateUnits(pid, updates);
      toast.success('Solver prices applied to all units');
      setSolverResult(null);
      load();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleRecalc = async () => {
    if (!pid) return;
    try {
      setRecalculating(true);
      await cashflowApi.recalculate(pid);
      toast.success('Recalculation complete');
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setRecalculating(false);
    }
  };

  // Get all buildings for bulk dropdown
  const allBuildings: Building[] = project?.phases.flatMap((p) => p.buildings) || [];

  const totalUnits = units.length;
  const soldUnits = units.filter((u) => u.status === 'closed').length;
  const contractUnits = units.filter((u) => u.status === 'under_contract').length;
  const availableUnits = units.filter((u) => u.status === 'available').length;
  const totalRevenue = units.reduce((sum, u) => sum + (u.sale_price || 0), 0);
  const totalSf = units.reduce((sum, u) => sum + (u.sf || 0), 0);
  const closedRevenue = units.filter((u) => u.status === 'closed').reduce((sum, u) => sum + (u.sale_price || 0), 0);
  const pipelineRevenue = units.filter((u) => u.status !== 'closed').reduce((sum, u) => sum + (u.sale_price || 0), 0);

  if (loading) {
    return <div className="flex items-center justify-center h-64 text-slate-400">Loading sales schedule...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
          <ShoppingCart size={20} /> Sales Schedule
        </h2>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowSolver(!showSolver)}
            className={`flex items-center gap-2 ${showSolver ? 'bg-purple-700' : 'bg-purple-600 hover:bg-purple-700'} text-white px-4 py-2 rounded text-sm font-medium transition-colors`}
          >
            <Target size={16} />
            Price Solver
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

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        <div className="bg-navy-800/50 border border-navy-700 rounded-lg p-3">
          <div className="text-xs text-slate-400 uppercase tracking-wider">Total Units</div>
          <div className="text-xl font-semibold font-financial text-white">{totalUnits}</div>
        </div>
        <div className="bg-navy-800/50 border border-emerald-700 rounded-lg p-3">
          <div className="text-xs text-slate-400 uppercase tracking-wider">Closed</div>
          <div className="text-xl font-semibold font-financial text-emerald-400">{soldUnits}</div>
        </div>
        <div className="bg-navy-800/50 border border-amber-700 rounded-lg p-3">
          <div className="text-xs text-slate-400 uppercase tracking-wider">Under Contract</div>
          <div className="text-xl font-semibold font-financial text-amber-400">{contractUnits}</div>
        </div>
        <div className="bg-navy-800/50 border border-blue-700 rounded-lg p-3">
          <div className="text-xs text-slate-400 uppercase tracking-wider">Available</div>
          <div className="text-xl font-semibold font-financial text-blue-400">{availableUnits}</div>
        </div>
        <div className="bg-navy-800/50 border border-navy-700 rounded-lg p-3">
          <div className="text-xs text-slate-400 uppercase tracking-wider">Closed Revenue</div>
          <div className="text-lg font-semibold font-financial text-emerald-400">{formatCurrency(closedRevenue)}</div>
        </div>
        <div className="bg-navy-800/50 border border-navy-700 rounded-lg p-3">
          <div className="text-xs text-slate-400 uppercase tracking-wider">Pipeline</div>
          <div className="text-lg font-semibold font-financial text-blue-400">{formatCurrency(pipelineRevenue)}</div>
        </div>
      </div>

      {/* Bulk Set $/PSF */}
      <div className="bg-navy-800/50 border border-navy-700 rounded-lg p-4">
        <h3 className="text-sm font-medium text-slate-300 mb-3">Set Building Default $/PSF</h3>
        <div className="flex items-center gap-3">
          <select
            value={bulkBuildingId}
            onChange={(e) => setBulkBuildingId(parseInt(e.target.value) || 0)}
            className="bg-navy-900 text-white text-sm px-3 py-2 rounded border border-navy-700"
          >
            <option value={0}>Select building...</option>
            {allBuildings.map((b) => (
              <option key={b.building_id} value={b.building_id}>{b.name} ({b.unit_count} units)</option>
            ))}
          </select>
          <div className="flex items-center gap-1">
            <span className="text-slate-400 text-sm">$</span>
            <input
              type="number"
              placeholder="$/PSF"
              value={bulkPsf}
              onChange={(e) => setBulkPsf(e.target.value)}
              className="bg-navy-900 text-white text-sm px-3 py-2 rounded border border-navy-700 w-24 font-financial"
            />
            <span className="text-slate-400 text-sm">/SF</span>
          </div>
          <button
            onClick={handleBulkSetPsf}
            disabled={!bulkBuildingId || !bulkPsf}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm font-medium disabled:opacity-50"
          >
            Apply to Building
          </button>
        </div>
      </div>

      {/* Reverse Price Solver */}
      {showSolver && (
        <div className="bg-purple-900/20 border border-purple-700/50 rounded-lg p-4">
          <h3 className="text-sm font-medium text-purple-300 mb-3 flex items-center gap-2">
            <Target size={16} /> Price from Target Return
          </h3>
          <div className="flex items-center gap-3 mb-4 flex-wrap">
            <select
              value={solverMetric}
              onChange={(e) => setSolverMetric(e.target.value as any)}
              className="bg-navy-900 text-white text-sm px-3 py-2 rounded border border-navy-700"
            >
              <option value="profit_margin">Profit Margin %</option>
              <option value="equity_multiple">Equity Multiple (x)</option>
              <option value="levered_irr">Levered IRR %</option>
            </select>
            <input
              type="number"
              step="0.01"
              value={solverValue}
              onChange={(e) => setSolverValue(e.target.value)}
              className="bg-navy-900 text-white text-sm px-3 py-2 rounded border border-navy-700 w-24 font-financial"
            />
            <span className="text-xs text-slate-400">
              {solverMetric === 'profit_margin' ? '(e.g. 0.20 = 20%)' :
               solverMetric === 'equity_multiple' ? '(e.g. 3.0 = 3.0x)' : '(e.g. 0.40 = 40%)'}
            </span>
            <select
              value={solverMode}
              onChange={(e) => setSolverMode(e.target.value as any)}
              className="bg-navy-900 text-white text-sm px-3 py-2 rounded border border-navy-700"
            >
              <option value="uniform">Uniform $/PSF</option>
              <option value="proportional">Proportional</option>
            </select>
            <button
              onClick={handleSolve}
              disabled={solving}
              className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded text-sm font-medium disabled:opacity-50"
            >
              {solving ? 'Solving...' : 'Calculate'}
            </button>
          </div>

          {solverResult && (
            <div className="bg-navy-900/50 rounded-lg p-4 space-y-3">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <div className="text-xs text-slate-400">Required Avg $/SF</div>
                  <div className="text-lg font-financial text-white font-semibold">{formatCurrency(solverResult.required_avg_psf)}</div>
                </div>
                <div>
                  <div className="text-xs text-slate-400">Break-Even $/SF</div>
                  <div className="text-lg font-financial text-slate-300">{formatCurrency(solverResult.break_even_psf)}</div>
                </div>
                <div>
                  <div className="text-xs text-slate-400">Target Revenue</div>
                  <div className="text-lg font-financial text-white">{formatCurrency(solverResult.target_revenue)}</div>
                </div>
              </div>

              {solverResult.building_suggestions.length > 0 && (
                <div>
                  <div className="text-xs text-slate-400 mb-2">Per-Building Suggested $/SF</div>
                  <div className="grid grid-cols-5 gap-2">
                    {solverResult.building_suggestions.map((b) => (
                      <div key={b.building_id} className="bg-navy-800 rounded px-2 py-1.5 text-xs">
                        <div className="text-slate-400">{b.building_name}</div>
                        <div className="text-white font-financial font-medium">{formatCurrency(b.suggested_psf)}/SF</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <button
                onClick={handleApplySolverPrices}
                className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded text-sm font-medium"
              >
                <Check size={16} /> Apply Prices to All Units
              </button>
            </div>
          )}
        </div>
      )}

      {/* Unit table */}
      <div className="bg-navy-800/50 border border-navy-700 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-navy-900/50 text-slate-400 text-xs uppercase tracking-wider">
                <th className="text-left py-2 px-3">Unit #</th>
                <th className="text-right py-2 px-3">SF</th>
                <th className="text-right py-2 px-3">$/PSF</th>
                <th className="text-right py-2 px-3">Sale Price</th>
                <th className="text-center py-2 px-3">Sale Month</th>
                <th className="text-center py-2 px-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {units.map((unit) => {
                const pricePsf = unit.sf && unit.sale_price ? unit.sale_price / unit.sf : 0;
                const statusColor = {
                  available: 'text-blue-400 bg-blue-900/20',
                  under_contract: 'text-amber-400 bg-amber-900/20',
                  closed: 'text-emerald-400 bg-emerald-900/20',
                }[unit.status] || 'text-slate-400';

                return (
                  <tr key={unit.unit_id} className="border-b border-navy-800/50 hover:bg-navy-800/30">
                    <td className="py-1.5 px-3 text-white font-medium">{unit.unit_number}</td>
                    <td className="py-1.5 px-3">
                      <input
                        type="number"
                        value={unit.sf || ''}
                        onChange={(e) => handleUpdate(unit.unit_id, 'sf', parseInt(e.target.value) || 0)}
                        className="editable-cell bg-transparent text-right font-financial text-sm w-20 px-1 py-0.5 rounded"
                      />
                    </td>
                    <td className="py-1.5 px-3">
                      <input
                        type="number"
                        step="1"
                        value={pricePsf > 0 ? Math.round(pricePsf) : ''}
                        onChange={(e) => {
                          const psf = parseFloat(e.target.value) || 0;
                          if (psf > 0 && unit.sf) handlePsfChange(unit.unit_id, psf, unit.sf);
                        }}
                        className="editable-cell bg-transparent text-right font-financial text-sm w-16 px-1 py-0.5 rounded"
                        placeholder="—"
                      />
                    </td>
                    <td className="py-1.5 px-3">
                      <CurrencyInput
                        value={unit.sale_price || 0}
                        onChange={(v) => handleUpdate(unit.unit_id, 'sale_price', v)}
                        className="w-28"
                      />
                    </td>
                    <td className="py-1.5 px-3 text-center">
                      <input
                        type="number"
                        min={0}
                        max={71}
                        value={unit.sale_month ?? ''}
                        onChange={(e) => handleUpdate(unit.unit_id, 'sale_month', e.target.value ? parseInt(e.target.value) : null)}
                        className="editable-cell bg-transparent text-center font-financial text-sm w-16 px-1 py-0.5 rounded"
                        placeholder="—"
                      />
                    </td>
                    <td className="py-1.5 px-3 text-center">
                      <select
                        value={unit.status}
                        onChange={(e) => handleUpdate(unit.unit_id, 'status', e.target.value)}
                        className={`bg-navy-900 text-xs rounded px-2 py-1 border border-navy-700 ${statusColor}`}
                      >
                        <option value="available">Available</option>
                        <option value="under_contract">Under Contract</option>
                        <option value="closed">Closed</option>
                      </select>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="bg-navy-900/70 font-medium">
                <td className="py-2 px-3 text-white">Total ({totalUnits} units)</td>
                <td className="py-2 px-3 text-right font-financial text-white">
                  {totalSf.toLocaleString()}
                </td>
                <td className="py-2 px-3 text-right font-financial text-slate-300">
                  {totalSf > 0 ? formatCurrency(totalRevenue / totalSf) : '—'}
                </td>
                <td className="py-2 px-3 text-right font-financial text-white">{formatCurrency(totalRevenue)}</td>
                <td colSpan={2}></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}
