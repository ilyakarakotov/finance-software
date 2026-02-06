import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useCalcEngine } from '../../hooks/useCalcEngine';
import type { MonthlyCashflow } from '../../types/cashflow';
import { formatCurrency, formatMonthDate } from '../../utils/format';
import SparkLine from '../shared/SparkLine';
import { clsx } from 'clsx';
import { ChevronDown, ChevronRight, RefreshCw, Info } from 'lucide-react';

interface RowGroup {
  label: string;
  color: string;
  fields: { key: keyof MonthlyCashflow; label: string }[];
}

const ROW_GROUPS: RowGroup[] = [
  {
    label: 'Development Costs',
    color: 'text-red-400',
    fields: [
      { key: 'construction_cost', label: 'Construction' },
      { key: 'contingency', label: 'Contingency' },
      { key: 'horizontal', label: 'Horizontal' },
      { key: 'soft_costs', label: 'Soft Costs' },
      { key: 'gc_fee', label: 'GC Fee' },
      { key: 'land', label: 'Land' },
      { key: 'other', label: 'Other' },
      { key: 'total_development_cost', label: 'Total Dev Cost' },
      { key: 'cumulative_development_cost', label: 'Cumulative Dev Cost' },
    ],
  },
  {
    label: 'Financing',
    color: 'text-blue-400',
    fields: [
      { key: 'equity_draw', label: 'Equity Draw' },
      { key: 'senior_draw', label: 'Senior Draw' },
      { key: 'senior_balance', label: 'Senior Balance' },
      { key: 'senior_interest', label: 'Senior Interest' },
      { key: 'mezz_draw', label: 'Mezz Draw' },
      { key: 'mezz_balance', label: 'Mezz Balance' },
      { key: 'mezz_interest', label: 'Mezz Interest' },
    ],
  },
  {
    label: 'Revenue',
    color: 'text-emerald-400',
    fields: [
      { key: 'gross_sales', label: 'Gross Sales' },
      { key: 'cost_of_sale', label: 'Cost of Sale' },
      { key: 'net_sales', label: 'Net Sales' },
      { key: 'loan_payoff_from_sales', label: 'Loan Payoff' },
    ],
  },
  {
    label: 'Returns',
    color: 'text-amber-400',
    fields: [
      { key: 'free_cashflow', label: 'Free Cashflow' },
      { key: 'cumulative_cashflow', label: 'Cumulative Cashflow' },
    ],
  },
];

export default function CashflowTimeline() {
  const { projectId } = useParams<{ projectId: string }>();
  const pid = projectId ? parseInt(projectId) : null;
  const { cashflows, recalculating, recalculate, loadCashflows } = useCalcEngine(pid);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [selectedCell, setSelectedCell] = useState<{ month: number; field: string } | null>(null);

  useEffect(() => {
    loadCashflows();
  }, [loadCashflows]);

  const toggleGroup = (label: string) => {
    setCollapsed((prev) => ({ ...prev, [label]: !prev[label] }));
  };

  const getCellColor = (groupColor: string, value: number): string => {
    if (value === 0) return 'text-slate-600';
    if (groupColor === 'text-red-400') return value > 0 ? 'text-red-300' : 'text-emerald-300';
    if (groupColor === 'text-emerald-400') return value > 0 ? 'text-emerald-300' : 'text-red-300';
    if (groupColor === 'text-blue-400') return 'text-blue-300';
    if (groupColor === 'text-amber-400') return value > 0 ? 'text-emerald-300' : 'text-red-300';
    return 'text-slate-300';
  };

  const cumulativeCfData = cashflows.map((cf) => cf.cumulative_cashflow);

  // Only show months with activity (non-zero values) + some buffer
  const activeMonths = cashflows.filter(
    (cf) => cf.total_development_cost !== 0 || cf.gross_sales !== 0 || cf.equity_draw !== 0
  );
  const displayCashflows = activeMonths.length > 0 ? cashflows : cashflows.slice(0, 24);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white">Monthly Cashflow Timeline</h2>
          <p className="text-xs text-slate-400 mt-1">{cashflows.length} months</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-48">
            <SparkLine data={cumulativeCfData} height={32} width={180} color="#f59e0b" />
          </div>
          <button
            onClick={recalculate}
            disabled={recalculating}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded text-sm font-medium transition-colors disabled:opacity-50"
          >
            <RefreshCw size={16} className={recalculating ? 'animate-spin' : ''} />
            {recalculating ? 'Recalculating...' : 'Recalculate'}
          </button>
        </div>
      </div>

      {/* Cell breakdown popup */}
      {selectedCell && (
        <div className="bg-navy-800 border border-navy-600 rounded-lg p-4 text-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-white font-medium flex items-center gap-1">
              <Info size={14} /> Cell Breakdown
            </span>
            <button onClick={() => setSelectedCell(null)} className="text-slate-400 hover:text-white text-xs">Close</button>
          </div>
          <div className="text-slate-300 font-financial">
            Month {selectedCell.month} — {selectedCell.field}: {formatCurrency(
              (cashflows[selectedCell.month] as any)?.[selectedCell.field] || 0
            )}
          </div>
        </div>
      )}

      {/* Timeline table */}
      <div className="bg-navy-800/50 border border-navy-700 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="text-xs border-collapse min-w-max">
            <thead className="sticky top-0 z-10">
              <tr className="bg-navy-900">
                <th className="sticky left-0 z-20 bg-navy-900 text-left py-2 px-3 text-slate-400 uppercase tracking-wider w-48 border-r border-navy-700">
                  Line Item
                </th>
                {displayCashflows.map((cf) => (
                  <th
                    key={cf.month_number}
                    className="text-center py-2 px-1.5 text-slate-400 min-w-[72px] border-r border-navy-800/50"
                  >
                    <div className="font-medium">M{cf.month_number}</div>
                    <div className="text-[10px] text-slate-500">{formatMonthDate(cf.calendar_date)}</div>
                  </th>
                ))}
              </tr>
            </thead>
            {ROW_GROUPS.map((group) => {
                const isCollapsed = collapsed[group.label];
                return (
                  <tbody key={group.label}>
                    {/* Group header */}
                    <tr
                      className="bg-navy-700/20 cursor-pointer hover:bg-navy-700/40 transition-colors"
                      onClick={() => toggleGroup(group.label)}
                    >
                      <td className="sticky left-0 bg-navy-700/30 py-1.5 px-3 font-medium border-r border-navy-700">
                        <span className={clsx('flex items-center gap-1', group.color)}>
                          {isCollapsed ? <ChevronRight size={12} /> : <ChevronDown size={12} />}
                          {group.label}
                        </span>
                      </td>
                      {displayCashflows.map((cf) => {
                        const summaryField = group.fields[group.fields.length - 1];
                        const val = (cf as any)[summaryField.key] as number;
                        return (
                          <td
                            key={cf.month_number}
                            className={clsx(
                              'text-right py-1.5 px-1.5 font-financial border-r border-navy-800/30',
                              getCellColor(group.color, val)
                            )}
                          >
                            {val !== 0 ? formatCurrency(val) : ''}
                          </td>
                        );
                      })}
                    </tr>

                    {/* Row items */}
                    {!isCollapsed &&
                      group.fields.map((field) => (
                        <tr key={field.key} className="hover:bg-navy-800/30">
                          <td className="sticky left-0 bg-navy-800/80 py-1 px-3 pl-6 text-slate-400 border-r border-navy-700 whitespace-nowrap">
                            {field.label}
                          </td>
                          {displayCashflows.map((cf) => {
                            const val = (cf as any)[field.key] as number;
                            return (
                              <td
                                key={cf.month_number}
                                className={clsx(
                                  'text-right py-1 px-1.5 font-financial border-r border-navy-800/10 cursor-pointer hover:bg-navy-700/30',
                                  getCellColor(group.color, val)
                                )}
                                onClick={() => setSelectedCell({ month: cf.month_number, field: field.key })}
                              >
                                {val !== 0 ? formatCurrency(val) : ''}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                  </tbody>
                );
              })}
          </table>
        </div>
      </div>
    </div>
  );
}
