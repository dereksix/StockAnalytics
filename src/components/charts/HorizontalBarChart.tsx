'use client';

interface BarItem {
  label: string;
  value: number;
  color?: string;
}

interface Props {
  data: BarItem[];
  title: string;
  formatValue?: (v: number) => string;
  maxItems?: number;
}

export default function HorizontalBarChart({
  data,
  title,
  formatValue = (v) => `${v >= 0 ? '+' : ''}${v.toFixed(2)}%`,
  maxItems = 15,
}: Props) {
  const items = data.slice(0, maxItems);
  if (items.length === 0) return null;

  const maxAbs = Math.max(...items.map(d => Math.abs(d.value)), 0.01);

  return (
    <div className="card p-4">
      <h3 className="mb-3 text-sm font-semibold text-text-secondary">{title}</h3>
      <div className="space-y-2">
        {items.map((item) => {
          const isPositive = item.value >= 0;
          const width = (Math.abs(item.value) / maxAbs) * 100;
          const barColor = item.color || (isPositive ? 'rgb(52, 211, 153)' : 'rgb(248, 113, 113)');

          return (
            <div key={item.label} className="flex items-center gap-3">
              <span className="w-16 text-xs text-text-secondary truncate shrink-0">{item.label}</span>
              <div className="flex-1 h-5 bg-elevated rounded-sm overflow-hidden relative">
                <div
                  className="h-full rounded-sm transition-all duration-300"
                  style={{
                    width: `${Math.max(width, 2)}%`,
                    backgroundColor: barColor,
                    opacity: 0.8,
                  }}
                />
              </div>
              <span className={`text-xs font-medium tabular-nums w-16 text-right ${isPositive ? 'text-gain' : 'text-loss'}`}>
                {formatValue(item.value)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
