import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { buildersCapitalApi } from '../../api/builders_capital';
import type { BCMapping, BCMappingCreate, BCSummary } from '../../types/builders_capital';
import CurrencyInput from '../shared/CurrencyInput';
import { formatCurrency, parsePercentInput } from '../../utils/format';
import toast from 'react-hot-toast';
import { Plus, Trash2, Wand2, RefreshCw } from 'lucide-react';

type Tab = 'mapping' | 'summary';

export default function BCMappingTable() {
  const { projectId } = useParams<{ projectId: string }>();
  const pid = projectId ? parseInt(projectId) : null;

  const [tab, setTab] = useState<Tab>('mapping');
  const [mappings, setMappings] = useState<BCMapping[]>([]);
  const [summary, setSummary] = useState<BCSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  const load = useCallback(async () => {
    if (!pid) return;
    try {
      setLoading(true);
      const [mapData, summaryData] = await Promise.all([
        buildersCapitalApi.list(pid),
        buildersCapitalApi.getSummary(pid),
      ]);
      setMappings(mapData);
      setSummary(summaryData);
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
      await buildersCapitalApi.update(id, { [field]: value });
      load();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await buildersCapitalApi.delete(id);
      toast.success('Mapping deleted');
      load();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleGenerate = async () => {
    if (!pid) return;
    try {
      setGenerating(true);
      await buildersCapitalApi.generate(pid);
      toast.success('Builders Capital mappings generated');
      load();
    } catch (err: any) {
      toast.error(err.message || 'Generation failed');
    } finally {
      setGenerating(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64 text-slate-400">Loading BC mappings...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">Builders Capital Mapping</h2>
        <button
          onClick={handleGenerate}
          disabled={generating}
          className="flex items-center gap-2 bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded text-sm font-medium transition-colors disabled:opacity-50"
        >
          <Wand2 size={16} />
          {generating ? 'Generating...' : 'Generate from Budget'}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-navy-700">
        <button
          onClick={() => setTab('mapping')}
          className={`px-4 py-2 font-medium text-sm transition-colors ${
            tab === 'mapping'
              ? 'text-blue-400 border-b-2 border-blue-500'
              : 'text-slate-400 hover:text-slate-300'
          }`}
        >
          Mapping
        </button>
        <button
          onClick={() => setTab('summary')}
          className={`px-4 py-2 font-medium text-sm transition-colors ${
            tab === 'summary'
              ? 'text-blue-400 border-b-2 border-blue-500'
              : 'text-slate-400 hover:text-slate-300'
          }`}
        >
          Summary
        </button>
      </div>

      {/* Mapping Tab */}
      {tab === 'mapping' && (
        <div className="bg-navy-800/50 border border-navy-700 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-navy-900/50 text-slate-400 text-xs uppercase tracking-wider">
                <th className="text-left py-2 px-3 w-40">BC Category</th>
                <th className="text-left py-2 px-3 w-24">CSI Code</th>
                <th className="text-left py-2 px-3">Description</th>
                <th className="text-right py-2 px-3 w-28">Amount</th>
                <th className="text-center py-2 px-3 w-20">Tax Rate</th>
                <th className="text-right py-2 px-3 w-28">Amount w/ Tax</th>
                <th className="text-right py-2 px-3 w-28">Adjustment</th>
                <th className="text-right py-2 px-3 w-28">Final</th>
                <th className="text-center py-2 px-3 w-8"></th>
              </tr>
            </thead>
            <tbody>
              {mappings.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 px-3 text-center text-slate-400">
                    No BC mappings. Click "Generate from Budget" to auto-create.
                  </td>
                </tr>
              ) : (
                mappings.map((mapping) => (
                  <tr
                    key={mapping.mapping_id}
                    className="border-b border-navy-800/50 hover:bg-navy-800/30"
                  >
                    <td className="py-1 px-3">
                      <input
                        type="text"
                        value={mapping.bc_category || ''}
                        onChange={(e) =>
                          handleUpdate(mapping.mapping_id, 'bc_category', e.target.value)
                        }
                        className="editable-cell bg-transparent text-slate-300 text-sm w-full px-1 py-0.5 rounded"
                        placeholder="BC category..."
                      />
                    </td>
                    <td className="py-1 px-3">
                      <input
                        type="text"
                        value={mapping.csi_code || ''}
                        onChange={(e) =>
                          handleUpdate(mapping.mapping_id, 'csi_code', e.target.value)
                        }
                        className="editable-cell bg-transparent text-slate-400 text-xs w-full px-1 py-0.5 rounded font-mono"
                        placeholder="Code"
                      />
                    </td>
                    <td className="py-1 px-3">
                      <input
                        type="text"
                        value={mapping.description || ''}
                        onChange={(e) =>
                          handleUpdate(mapping.mapping_id, 'description', e.target.value)
                        }
                        className="editable-cell bg-transparent text-slate-300 text-sm w-full px-1 py-0.5 rounded"
                        placeholder="Description..."
                      />
                    </td>
                    <td className="py-1 px-3">
                      <CurrencyInput
                        value={mapping.amount || 0}
                        onChange={(v) => handleUpdate(mapping.mapping_id, 'amount', v)}
                        className="text-sm"
                      />
                    </td>
                    <td className="py-1 px-3">
                      <input
                        type="text"
                        value={((mapping.tax_rate || 0) * 100).toFixed(1)}
                        onChange={(e) =>
                          handleUpdate(
                            mapping.mapping_id,
                            'tax_rate',
                            parsePercentInput(e.target.value)
                          )
                        }
                        className="editable-cell bg-transparent text-right text-slate-300 text-sm w-full px-1 py-0.5 rounded"
                        placeholder="0%"
                      />
                    </td>
                    <td className="py-1 px-3 text-right text-slate-400 italic text-sm">
                      {formatCurrency(mapping.amount_with_tax || 0)}
                    </td>
                    <td className="py-1 px-3">
                      <CurrencyInput
                        value={mapping.adjustment || 0}
                        onChange={(v) => handleUpdate(mapping.mapping_id, 'adjustment', v)}
                        className="text-sm"
                      />
                    </td>
                    <td className="py-1 px-3 text-right text-slate-400 italic text-sm">
                      {formatCurrency(mapping.final_amount || 0)}
                    </td>
                    <td className="py-1 px-3">
                      <button
                        onClick={() => handleDelete(mapping.mapping_id)}
                        className="text-red-400 hover:text-red-300"
                      >
                        <Trash2 size={12} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {mappings.length > 0 && (
              <tfoot>
                <tr className="bg-navy-900/70 font-semibold">
                  <td colSpan={3} className="py-2 px-3 text-white">
                    Total
                  </td>
                  <td className="py-2 px-3 text-right font-financial text-white">
                    {formatCurrency(mappings.reduce((sum, m) => sum + (m.amount || 0), 0))}
                  </td>
                  <td></td>
                  <td className="py-2 px-3 text-right font-financial text-white">
                    {formatCurrency(mappings.reduce((sum, m) => sum + (m.amount_with_tax || 0), 0))}
                  </td>
                  <td className="py-2 px-3 text-right font-financial text-white">
                    {formatCurrency(mappings.reduce((sum, m) => sum + (m.adjustment || 0), 0))}
                  </td>
                  <td className="py-2 px-3 text-right font-financial text-white">
                    {formatCurrency(mappings.reduce((sum, m) => sum + (m.final_amount || 0), 0))}
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      )}

      {/* Summary Tab */}
      {tab === 'summary' && (
        <div className="bg-navy-800/50 border border-navy-700 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-navy-900/50 text-slate-400 text-xs uppercase tracking-wider">
                <th className="text-left py-2 px-4">BC Category</th>
                <th className="text-right py-2 px-4">Count</th>
                <th className="text-right py-2 px-4">Amount</th>
                <th className="text-right py-2 px-4">Amount w/ Tax</th>
              </tr>
            </thead>
            <tbody>
              {summary.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-8 px-4 text-center text-slate-400">
                    No summary data available
                  </td>
                </tr>
              ) : (
                summary.map((item, idx) => (
                  <tr key={idx} className="border-b border-navy-800/50 hover:bg-navy-800/30">
                    <td className="py-2 px-4 text-slate-300 font-medium">{item.bc_category}</td>
                    <td className="py-2 px-4 text-right text-slate-300">{item.count}</td>
                    <td className="py-2 px-4 text-right font-financial text-white">
                      {formatCurrency(item.total_amount || 0)}
                    </td>
                    <td className="py-2 px-4 text-right font-financial text-white">
                      {formatCurrency(item.total_with_tax || 0)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {summary.length > 0 && (
              <tfoot>
                <tr className="bg-navy-900/70 font-semibold">
                  <td className="py-2 px-4 text-white">TOTAL</td>
                  <td className="py-2 px-4 text-right text-white">
                    {summary.reduce((sum, s) => sum + (s.count || 0), 0)}
                  </td>
                  <td className="py-2 px-4 text-right font-financial text-white">
                    {formatCurrency(summary.reduce((sum, s) => sum + (s.total_amount || 0), 0))}
                  </td>
                  <td className="py-2 px-4 text-right font-financial text-white">
                    {formatCurrency(summary.reduce((sum, s) => sum + (s.total_with_tax || 0), 0))}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      )}
    </div>
  );
}
