import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { budgetApi } from '../../api/budget';
import { cashflowApi } from '../../api/cashflow';
import type { BudgetLineItem, BudgetLineItemCreate, BudgetCategory } from '../../types/budget';
import { CATEGORY_LABELS, CATEGORY_ORDER } from '../../types/budget';
import CurrencyInput from '../shared/CurrencyInput';
import SparkLine from '../shared/SparkLine';
import { formatCurrency } from '../../utils/format';
import toast from 'react-hot-toast';
import { Plus, Trash2, ChevronDown, ChevronRight, RefreshCw, Wand2 } from 'lucide-react';

export default function BudgetTable() {
  const { projectId } = useParams<{ projectId: string }>();
  const pid = projectId ? parseInt(projectId) : null;
  const [items, setItems] = useState<BudgetLineItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [sCurveCache, setSCurveCache] = useState<Record<number, number[]>>({});
  const [recalculating, setRecalculating] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const load = useCallback(async () => {
    if (!pid) return;
    try {
      setLoading(true);
      const data = await budgetApi.list(pid);
      setItems(data);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }, [pid]);

  useEffect(() => { load(); }, [load]);

  const loadSCurve = async (item: BudgetLineItem) => {
    if (item.budget_amount <= 0 || item.duration_months <= 0) return;
    try {
      const res = await budgetApi.previewSCurve(item.budget_amount, item.duration_months, item.s_curve_steepness);
      setSCurveCache((prev) => ({ ...prev, [item.line_item_id]: res.monthly_amounts }));
    } catch {}
  };

  const handleAdd = async (category: BudgetCategory) => {
    if (!pid) return;
    try {
      const newItem: BudgetLineItemCreate = {
        project_id: pid,
        category,
        description: '',
        budget_amount: 0,
        forecast_method: 's_curve',
        start_month: 0,
        duration_months: 12,
        s_curve_steepness: 5,
      };
      await budgetApi.create(newItem);
      toast.success('Line item added');
      load();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleUpdate = async (id: number, field: string, value: any) => {
    try {
      await budgetApi.update(id, { [field]: value });
      load();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await budgetApi.delete(id);
      toast.success('Line item deleted');
      load();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleGenerate = async () => {
    if (!pid) return;
    try {
      setGenerating(true);
      setShowConfirm(false);
      await budgetApi.generateFromBuildings(pid);
      toast.success('Budget generated from buildings');
      load();
    } catch (err: any) {
      toast.error(err.message || 'Generation failed');
    } finally {
      setGenerating(false);
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

  const toggleCategory = (cat: string) => {
    setCollapsed((prev) => ({ ...prev, [cat]: !prev[cat] }));
  };

  const grouped = CATEGORY_ORDER.reduce((acc, cat) => {
    acc[cat] = items.filter((i) => i.category === cat);
    return acc;
  }, {} as Record<BudgetCategory, BudgetLineItem[]>);

  const grandTotal = items.reduce((sum, i) => sum + (i.budget_amount || 0), 0);

  if (loading) {
    return <div className="flex items-center justify-center h-64 text-slate-400">Loading budget...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">Budget / Cost Engine</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowConfirm(true)}
            disabled={generating}
            className="flex items-center gap-2 bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded text-sm font-medium transition-colors disabled:opacity-50"
          >
            <Wand2 size={16} />
            {generating ? 'Generating...' : 'Generate from Buildings'}
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

      {/* Confirmation dialog */}
      {showConfirm && (
        <div className="bg-amber-900/30 border border-amber-600/50 rounded-lg p-4">
          <p className="text-sm text-amber-200 mb-3">
            This will regenerate all <strong>construction</strong>, <strong>contingency</strong>, and <strong>GC fee</strong> line items from building data.
            Horizontal, soft costs, land, and other items will not be affected.
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={handleGenerate}
              className="bg-amber-600 hover:bg-amber-700 text-white px-3 py-1.5 rounded text-sm font-medium"
            >
              Continue
            </button>
            <button
              onClick={() => setShowConfirm(false)}
              className="bg-navy-700 hover:bg-navy-600 text-slate-300 px-3 py-1.5 rounded text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="bg-navy-800/50 border border-navy-700 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-navy-900/50 text-slate-400 text-xs uppercase tracking-wider">
              <th className="text-left py-2 px-3 w-8"></th>
              <th className="text-left py-2 px-3">Description</th>
              <th className="text-left py-2 px-3 w-24">CSI Code</th>
              <th className="text-right py-2 px-3 w-32">Amount</th>
              <th className="text-center py-2 px-3 w-24">Method</th>
              <th className="text-center py-2 px-3 w-20">Start Mo</th>
              <th className="text-center py-2 px-3 w-20">Duration</th>
              <th className="text-center py-2 px-3 w-20">Steepness</th>
              <th className="text-center py-2 px-3 w-32">S-Curve Preview</th>
              <th className="text-center py-2 px-3 w-8"></th>
            </tr>
          </thead>
          {CATEGORY_ORDER.map((cat) => {
              const catItems = grouped[cat];
              const catTotal = catItems.reduce((sum, i) => sum + (i.budget_amount || 0), 0);
              const isCollapsed = collapsed[cat];

              return (
                <tbody key={cat}>
                  {/* Category header */}
                  <tr
                    className="bg-navy-700/30 cursor-pointer hover:bg-navy-700/50 transition-colors"
                    onClick={() => toggleCategory(cat)}
                  >
                    <td className="py-2 px-3 text-slate-300">
                      {isCollapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
                    </td>
                    <td className="py-2 px-3 text-white font-medium" colSpan={2}>
                      {CATEGORY_LABELS[cat]}
                      <span className="text-xs text-slate-400 ml-2">({catItems.length} items)</span>
                    </td>
                    <td className="py-2 px-3 text-right font-financial text-white font-medium">
                      {formatCurrency(catTotal)}
                    </td>
                    <td colSpan={5}></td>
                    <td className="py-2 px-3">
                      <button
                        onClick={(e) => { e.stopPropagation(); handleAdd(cat); }}
                        className="text-blue-400 hover:text-blue-300"
                      >
                        <Plus size={14} />
                      </button>
                    </td>
                  </tr>

                  {/* Line items */}
                  {!isCollapsed && catItems.map((item) => (
                    <tr key={item.line_item_id} className="border-b border-navy-800/50 hover:bg-navy-800/30">
                      <td className="py-1 px-3"></td>
                      <td className="py-1 px-3">
                        <div className="flex items-center gap-1">
                          {item.is_auto_generated && (
                            <span className="text-amber-400 flex-shrink-0" title="Auto-generated">
                              <Wand2 size={10} />
                            </span>
                          )}
                          <input
                            type="text"
                            value={item.description || ''}
                            onChange={(e) => handleUpdate(item.line_item_id, 'description', e.target.value)}
                            className="editable-cell bg-transparent text-slate-300 text-sm w-full px-1 py-0.5 rounded"
                            placeholder="Enter description..."
                          />
                        </div>
                      </td>
                      <td className="py-1 px-3">
                        <input
                          type="text"
                          value={item.csi_code || ''}
                          onChange={(e) => handleUpdate(item.line_item_id, 'csi_code', e.target.value)}
                          className="editable-cell bg-transparent text-slate-400 text-xs w-full px-1 py-0.5 rounded"
                        />
                      </td>
                      <td className="py-1 px-3">
                        <CurrencyInput
                          value={item.budget_amount}
                          onChange={(v) => handleUpdate(item.line_item_id, 'budget_amount', v)}
                          className="text-sm"
                        />
                      </td>
                      <td className="py-1 px-3 text-center">
                        <select
                          value={item.forecast_method}
                          onChange={(e) => handleUpdate(item.line_item_id, 'forecast_method', e.target.value)}
                          className="bg-navy-900 text-slate-300 text-xs rounded px-1 py-0.5 border border-navy-700"
                        >
                          <option value="s_curve">S-Curve</option>
                          <option value="straight_line">Straight Line</option>
                          <option value="manual">Manual</option>
                        </select>
                      </td>
                      <td className="py-1 px-3 text-center">
                        <input
                          type="number"
                          value={item.start_month}
                          onChange={(e) => handleUpdate(item.line_item_id, 'start_month', parseInt(e.target.value) || 0)}
                          className="editable-cell bg-transparent text-center font-financial text-xs w-12 px-1 py-0.5 rounded"
                        />
                      </td>
                      <td className="py-1 px-3 text-center">
                        <input
                          type="number"
                          value={item.duration_months}
                          onChange={(e) => handleUpdate(item.line_item_id, 'duration_months', parseInt(e.target.value) || 1)}
                          className="editable-cell bg-transparent text-center font-financial text-xs w-12 px-1 py-0.5 rounded"
                        />
                      </td>
                      <td className="py-1 px-3 text-center">
                        <input
                          type="range"
                          min={1}
                          max={9}
                          value={item.s_curve_steepness}
                          onChange={(e) => {
                            handleUpdate(item.line_item_id, 's_curve_steepness', parseInt(e.target.value));
                            loadSCurve({ ...item, s_curve_steepness: parseInt(e.target.value) });
                          }}
                          className="w-16 accent-blue-500"
                          disabled={item.forecast_method !== 's_curve'}
                        />
                        <span className="text-xs text-slate-400 ml-1">{item.s_curve_steepness}</span>
                      </td>
                      <td className="py-1 px-3 flex items-center justify-center">
                        {item.forecast_method === 's_curve' && sCurveCache[item.line_item_id] ? (
                          <SparkLine data={sCurveCache[item.line_item_id]} width={100} height={24} />
                        ) : (
                          <button
                            onClick={() => loadSCurve(item)}
                            className="text-xs text-blue-400 hover:text-blue-300"
                            disabled={item.forecast_method !== 's_curve'}
                          >
                            Preview
                          </button>
                        )}
                      </td>
                      <td className="py-1 px-3">
                        <button
                          onClick={() => handleDelete(item.line_item_id)}
                          className="text-red-400 hover:text-red-300"
                        >
                          <Trash2 size={12} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              );
            })}
          <tfoot>
            <tr className="bg-navy-900/70 font-semibold">
              <td colSpan={3} className="py-2 px-3 text-white">Grand Total</td>
              <td className="py-2 px-3 text-right font-financial text-white">{formatCurrency(grandTotal)}</td>
              <td colSpan={6}></td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
