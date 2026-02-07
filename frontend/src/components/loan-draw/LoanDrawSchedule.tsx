import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { loanDrawsApi } from '../../api/loan_draws';
import type { LoanDraw, LoanDrawPeriod } from '../../types/loan_draw';
import { DRAW_CATEGORY_LABELS } from '../../types/loan_draw';
import CurrencyInput from '../shared/CurrencyInput';
import { formatCurrency } from '../../utils/format';
import toast from 'react-hot-toast';
import { Plus, Trash2, RefreshCw, Wand2, Calendar } from 'lucide-react';

export default function LoanDrawSchedule() {
  const { projectId } = useParams<{ projectId: string }>();
  const pid = projectId ? parseInt(projectId) : null;

  const [draws, setDraws] = useState<LoanDraw[]>([]);
  const [loading, setLoading] = useState(true);
  const [maxDrawPeriods, setMaxDrawPeriods] = useState(0);
  const [generating, setGenerating] = useState(false);

  const load = useCallback(async () => {
    if (!pid) return;
    try {
      setLoading(true);
      const data = await loanDrawsApi.list(pid);
      setDraws(data);

      // Find max draw periods
      let max = 0;
      data.forEach((draw) => {
        if (draw.periods && draw.periods.length > max) {
          max = draw.periods.length;
        }
      });
      setMaxDrawPeriods(max);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }, [pid]);

  useEffect(() => {
    load();
  }, [load]);

  const handleUpdate = async (id: number, field: string, value: any) => {
    try {
      await loanDrawsApi.update(id, { [field]: value });
      load();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleUpdatePeriod = async (periodId: number, amount: number) => {
    try {
      await loanDrawsApi.updatePeriod(periodId, { amount });
      load();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await loanDrawsApi.delete(id);
      toast.success('Loan draw deleted');
      load();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleAddPeriod = async (drawId: number) => {
    try {
      const period: Omit<LoanDrawPeriod, 'period_id' | 'loan_draw_id'> = {
        draw_number: maxDrawPeriods + 1,
        amount: 0,
      };
      await loanDrawsApi.addPeriod(drawId, period);
      toast.success('Draw period added');
      load();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleGenerate = async () => {
    if (!pid) return;
    try {
      setGenerating(true);
      await loanDrawsApi.generateFromBudget(pid);
      toast.success('Loan draws generated from budget');
      load();
    } catch (err: any) {
      toast.error(err.message || 'Generation failed');
    } finally {
      setGenerating(false);
    }
  };

  // Group by draw_category
  const groupedByCategory = draws.reduce(
    (acc, draw) => {
      const cat = draw.draw_category;
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(draw);
      return acc;
    },
    {} as Record<string, LoanDraw[]>
  );

  const categories = Object.keys(DRAW_CATEGORY_LABELS) as Array<keyof typeof DRAW_CATEGORY_LABELS>;

  const grandTotalBudget = draws.reduce((sum, d) => sum + (d.budget_amount || 0), 0);
  const grandTotalDrawn = draws.reduce((sum, d) => sum + (d.drawn_at_closing || 0), 0);
  const grandTotalDrawBudget = draws.reduce((sum, d) => sum + (d.draw_budget || 0), 0);

  const allPeriodTotals = Array.from({ length: maxDrawPeriods }).map((_, i) => {
    return draws.reduce((sum, draw) => {
      const period = draw.periods?.find((p) => p.draw_number === i + 1);
      return sum + (period?.amount || 0);
    }, 0);
  });

  if (loading) {
    return <div className="flex items-center justify-center h-64 text-slate-400">Loading loan draw schedule...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">Loan Draw Schedule</h2>
        <button
          onClick={handleGenerate}
          disabled={generating}
          className="flex items-center gap-2 bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded text-sm font-medium transition-colors disabled:opacity-50"
        >
          <Wand2 size={16} />
          {generating ? 'Generating...' : 'Generate from Budget'}
        </button>
      </div>

      {/* Schedule Table */}
      <div className="bg-navy-800/50 border border-navy-700 rounded-lg overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-navy-900/50 text-slate-400 text-xs uppercase tracking-wider">
              <th className="text-left py-2 px-3 min-w-40">Description</th>
              <th className="text-right py-2 px-3 w-28">Budget</th>
              <th className="text-right py-2 px-3 w-28">Drawn at Closing</th>
              <th className="text-right py-2 px-3 w-28">Draw Budget</th>
              {Array.from({ length: maxDrawPeriods }).map((_, i) => (
                <th key={i} className="text-center py-2 px-3 w-28">
                  <div className="text-xs whitespace-nowrap">Draw #{i + 1}</div>
                </th>
              ))}
              <th className="text-center py-2 px-3 w-8"></th>
            </tr>
          </thead>
          <tbody>
            {categories.map((category) => {
              const categoryDraws = groupedByCategory[category] || [];
              const catBudgetTotal = categoryDraws.reduce((sum, d) => sum + (d.budget_amount || 0), 0);
              const catDrawnTotal = categoryDraws.reduce((sum, d) => sum + (d.drawn_at_closing || 0), 0);
              const catDrawBudgetTotal = categoryDraws.reduce((sum, d) => sum + (d.draw_budget || 0), 0);

              return (
                <tbody key={category}>
                  {/* Category header */}
                  <tr className="bg-navy-700/20">
                    <td className="py-2 px-3 text-white font-semibold uppercase text-xs">
                      {DRAW_CATEGORY_LABELS[category]}
                    </td>
                    <td className="py-2 px-3 text-right font-financial font-semibold text-white">
                      {formatCurrency(catBudgetTotal)}
                    </td>
                    <td className="py-2 px-3 text-right font-financial font-semibold text-white">
                      {formatCurrency(catDrawnTotal)}
                    </td>
                    <td className="py-2 px-3 text-right font-financial font-semibold text-white">
                      {formatCurrency(catDrawBudgetTotal)}
                    </td>
                    {Array.from({ length: maxDrawPeriods }).map((_, i) => {
                      const periodTotal = categoryDraws.reduce((sum, d) => {
                        const period = d.periods?.find((p) => p.draw_number === i + 1);
                        return sum + (period?.amount || 0);
                      }, 0);
                      return (
                        <td
                          key={i}
                          className="py-2 px-3 text-right font-financial font-semibold text-white"
                        >
                          {formatCurrency(periodTotal)}
                        </td>
                      );
                    })}
                    <td></td>
                  </tr>

                  {/* Individual draw items */}
                  {categoryDraws.map((draw) => (
                    <tr key={draw.loan_draw_id} className="border-b border-navy-800/50 hover:bg-navy-800/30">
                      <td className="py-1 px-3">
                        <input
                          type="text"
                          value={draw.description || ''}
                          onChange={(e) =>
                            handleUpdate(draw.loan_draw_id, 'description', e.target.value)
                          }
                          className="editable-cell bg-transparent text-slate-300 text-sm w-full px-1 py-0.5 rounded"
                          placeholder="Enter description..."
                        />
                      </td>
                      <td className="py-1 px-3">
                        <CurrencyInput
                          value={draw.budget_amount || 0}
                          onChange={(v) => handleUpdate(draw.loan_draw_id, 'budget_amount', v)}
                          className="text-sm"
                        />
                      </td>
                      <td className="py-1 px-3">
                        <CurrencyInput
                          value={draw.drawn_at_closing || 0}
                          onChange={(v) => handleUpdate(draw.loan_draw_id, 'drawn_at_closing', v)}
                          className="text-sm"
                        />
                      </td>
                      <td className="py-1 px-3 text-right text-slate-400 italic text-sm">
                        {formatCurrency((draw.budget_amount || 0) - (draw.drawn_at_closing || 0))}
                      </td>

                      {/* Draw period amounts */}
                      {Array.from({ length: maxDrawPeriods }).map((_, i) => {
                        const period = draw.periods?.find((p) => p.draw_number === i + 1);
                        return (
                          <td key={i} className="py-1 px-3">
                            <CurrencyInput
                              value={period?.amount || 0}
                              onChange={(v) =>
                                period
                                  ? handleUpdatePeriod(period.period_id, v)
                                  : handleAddPeriod(draw.loan_draw_id)
                              }
                              className="text-sm"
                            />
                          </td>
                        );
                      })}

                      <td className="py-1 px-3">
                        <button
                          onClick={() => handleDelete(draw.loan_draw_id)}
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

            {/* Grand total row */}
            <tr className="bg-navy-900/70 font-semibold">
              <td className="py-2 px-3 text-white">TOTAL</td>
              <td className="py-2 px-3 text-right font-financial text-white">
                {formatCurrency(grandTotalBudget)}
              </td>
              <td className="py-2 px-3 text-right font-financial text-white">
                {formatCurrency(grandTotalDrawn)}
              </td>
              <td className="py-2 px-3 text-right font-financial text-white">
                {formatCurrency(grandTotalDrawBudget)}
              </td>
              {allPeriodTotals.map((total, i) => (
                <td key={i} className="py-2 px-3 text-right font-financial text-white">
                  {formatCurrency(total)}
                </td>
              ))}
              <td></td>
            </tr>
          </tbody>
        </table>
      </div>

      {draws.length === 0 && (
        <div className="text-center py-8 text-slate-400">
          No loan draws configured. Click "Generate from Budget" to auto-create from budget items.
        </div>
      )}
    </div>
  );
}
