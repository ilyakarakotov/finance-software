import { clsx } from 'clsx';

interface MetricCardProps {
  label: string;
  value: string;
  subtitle?: string;
  color?: 'default' | 'green' | 'red' | 'blue' | 'amber';
  onClick?: () => void;
}

const colorClasses = {
  default: 'border-navy-700',
  green: 'border-emerald-600',
  red: 'border-red-600',
  blue: 'border-blue-600',
  amber: 'border-amber-600',
};

export default function MetricCard({ label, value, subtitle, color = 'default', onClick }: MetricCardProps) {
  return (
    <div
      className={clsx(
        'bg-navy-800/50 border rounded-lg p-4 backdrop-blur-sm',
        colorClasses[color],
        onClick && 'cursor-pointer hover:bg-navy-700/50 transition-colors'
      )}
      onClick={onClick}
    >
      <div className="text-xs text-slate-400 uppercase tracking-wider mb-1">{label}</div>
      <div className="text-xl font-semibold font-financial text-white">{value}</div>
      {subtitle && <div className="text-xs text-slate-500 mt-1">{subtitle}</div>}
    </div>
  );
}
