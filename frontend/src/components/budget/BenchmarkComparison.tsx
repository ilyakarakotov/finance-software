import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { budgetApi } from '../../api/budget';
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import { formatPercent, formatCurrency } from '../../utils/format';

interface BenchmarkData {
  code: string;
  name: string;
  actual_pct: number;
  benchmark_pct: number;
  variance: number;
}

export default function BenchmarkComparison() {
  const { projectId } = useParams<{ projectId: string }>();
  const pid = projectId ? parseInt(projectId) : null;

  const [data, setData] = useState<BenchmarkData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      if (!pid) return;
      try {
        setLoading(true);
        const result = await budgetApi.benchmarkComparison(pid);
        // Convert result object to array
        const dataArray = Object.entries(result).map(([key, value]: any) => ({
          code: value.code || key,
          name: value.name || key,
          actual_pct: value.actual_pct || 0,
          benchmark_pct: value.benchmark_pct || 0,
          variance: (value.actual_pct || 0) - (value.benchmark_pct || 0),
        }));
        setData(dataArray);
      } catch (err) {
        setData([]);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [pid]);

  const getVarianceColor = (variance: number) => {
    if (Math.abs(variance) <= 0.5) return '#10b981'; // green - on target
    if (variance > 0) return '#ef4444'; // red - over
    return '#3b82f6'; // blue - under
  };

  const chartData = data.map((item) => ({
    ...item,
    varianceColor: getVarianceColor(item.variance),
  }));

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-400">
        Loading benchmark data...
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-400">
        No benchmark data available
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Chart */}
      <div className="bg-navy-800/50 border border-navy-700 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Actual vs Benchmark %</h3>
        <ResponsiveContainer width="100%" height={400}>
          <BarChart
            data={chartData}
            margin={{ top: 20, right: 30, left: 0, bottom: 5 }}
            layout="vertical"
          >
            <XAxis type="number" />
            <YAxis dataKey="code" type="category" width={80} tick={{ fontSize: 12, fill: '#cbd5e1' }} />
            <Tooltip
              contentStyle={{
                backgroundColor: '#1e293b',
                border: '1px solid #334155',
                borderRadius: '8px',
                color: '#f1f5f9',
              }}
              formatter={(value: any) => `${(value * 100).toFixed(1)}%`}
            />
            <Legend wrapperStyle={{ color: '#cbd5e1' }} />
            <Bar dataKey="actual_pct" fill="#3b82f6" name="Actual %" radius={[0, 4, 4, 0]} />
            <Bar dataKey="benchmark_pct" fill="#10b981" name="Benchmark %" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Table */}
      <div className="bg-navy-800/50 border border-navy-700 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-navy-900/50 text-slate-400 text-xs uppercase tracking-wider">
              <th className="text-left py-2 px-4">Code</th>
              <th className="text-left py-2 px-4">Division</th>
              <th className="text-right py-2 px-4">Actual %</th>
              <th className="text-right py-2 px-4">Benchmark %</th>
              <th className="text-right py-2 px-4">Variance</th>
              <th className="text-center py-2 px-4">Status</th>
            </tr>
          </thead>
          <tbody>
            {data.map((item, idx) => {
              const varianceColor = getVarianceColor(item.variance);
              let statusLabel = 'On Target';
              let statusEmoji = '✅';
              if (item.variance > 0.5) {
                statusLabel = 'Over';
                statusEmoji = '⚠️';
              } else if (item.variance < -0.5) {
                statusLabel = 'Under';
                statusEmoji = '✅';
              }

              return (
                <tr
                  key={idx}
                  className="border-b border-navy-800/50 hover:bg-navy-800/30"
                >
                  <td className="py-2 px-4 font-mono text-slate-400">{item.code}</td>
                  <td className="py-2 px-4 text-slate-300">{item.name}</td>
                  <td className="py-2 px-4 text-right text-slate-300">
                    {formatPercent(item.actual_pct / 100, 1)}
                  </td>
                  <td className="py-2 px-4 text-right text-slate-300">
                    {formatPercent(item.benchmark_pct / 100, 1)}
                  </td>
                  <td
                    className="py-2 px-4 text-right font-semibold"
                    style={{ color: varianceColor }}
                  >
                    {item.variance > 0 ? '+' : ''}{formatPercent(item.variance / 100, 1)}
                  </td>
                  <td className="py-2 px-4 text-center">
                    <span title={statusLabel}>{statusEmoji}</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
