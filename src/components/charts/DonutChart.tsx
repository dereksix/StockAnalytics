'use client';

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

const COLORS_HEX = [
  '#6382ff', '#34d399', '#fbbf24', '#f87171', '#a855f7',
  '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1',
  '#14b8a6', '#e879f9', '#facc15', '#fb923c', '#38bdf8',
];

function formatCurrency(value: number): string {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(1)}K`;
  return `$${value.toFixed(0)}`;
}

interface DataItem {
  name: string;
  value: number;
  weight: number;
}

interface Props {
  data: DataItem[];
  title: string;
  centerLabel?: string;
  centerValue?: string;
  topN?: number; // group everything beyond top N into "Other"
  height?: number;
}

export default function DonutChart({ data, title, centerLabel, centerValue, topN = 10, height = 280 }: Props) {
  // Group into top N + Other
  const sorted = [...data].sort((a, b) => b.value - a.value);
  let chartData: DataItem[];
  if (sorted.length > topN) {
    const top = sorted.slice(0, topN);
    const otherValue = sorted.slice(topN).reduce((s, d) => s + d.value, 0);
    const otherWeight = sorted.slice(topN).reduce((s, d) => s + d.weight, 0);
    chartData = [...top, { name: 'Other', value: otherValue, weight: otherWeight }];
  } else {
    chartData = sorted;
  }

  if (chartData.length === 0) return null;

  return (
    <div className="card p-4">
      <h3 className="mb-3 text-sm font-semibold text-text-secondary">{title}</h3>
      <div className="flex items-start gap-4">
        <div style={{ width: height, height, minWidth: height }} className="relative">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius="55%"
                outerRadius="85%"
                paddingAngle={2}
                dataKey="value"
                nameKey="name"
                stroke="rgb(18, 18, 24)"
                strokeWidth={2}
              >
                {chartData.map((_, index) => (
                  <Cell key={index} fill={COLORS_HEX[index % COLORS_HEX.length]} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value: number) => formatCurrency(value)}
                contentStyle={{
                  backgroundColor: 'rgb(26, 26, 36)',
                  border: '1px solid rgb(60, 60, 78)',
                  borderRadius: '8px',
                  color: 'rgb(240, 240, 245)',
                }}
                itemStyle={{ color: 'rgb(180, 180, 195)' }}
                labelStyle={{ color: 'rgb(240, 240, 245)' }}
              />
            </PieChart>
          </ResponsiveContainer>
          {centerLabel && (
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-xs text-text-muted">{centerLabel}</span>
              {centerValue && <span className="text-lg font-bold text-text-primary">{centerValue}</span>}
            </div>
          )}
        </div>
        {/* Legend */}
        <div className="flex-1 space-y-1.5 min-w-0 max-h-[260px] overflow-y-auto">
          {chartData.map((item, i) => (
            <div key={item.name} className="flex items-center gap-2 text-xs">
              <span
                className="h-2.5 w-2.5 rounded-sm shrink-0"
                style={{ backgroundColor: COLORS_HEX[i % COLORS_HEX.length] }}
              />
              <span className="truncate text-text-secondary flex-1">{item.name}</span>
              <span className="text-text-tertiary tabular-nums">{item.weight.toFixed(1)}%</span>
              <span className="text-text-muted tabular-nums">{formatCurrency(item.value)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
