'use client';

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

interface AllocationChartProps {
  data: { sector: string; value: number; weight: number }[];
}

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

export default function AllocationChart({ data }: AllocationChartProps) {
  if (data.length === 0) return null;

  const totalValue = data.reduce((s, d) => s + d.value, 0);

  return (
    <div className="card p-4">
      <h3 className="mb-3 text-sm font-semibold text-text-secondary">Sector Allocation</h3>
      <div className="flex items-start gap-4">
        {/* Chart */}
        <div className="relative" style={{ width: 200, height: 200, minWidth: 200 }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={90}
                paddingAngle={2}
                dataKey="value"
                nameKey="sector"
                stroke="rgb(18, 18, 24)"
                strokeWidth={2}
              >
                {data.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS_HEX[index % COLORS_HEX.length]} />
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
          {/* Center label */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="text-xs text-text-muted">Total</span>
            <span className="text-sm font-bold text-text-primary">{formatCurrency(totalValue)}</span>
          </div>
        </div>
        {/* Legend */}
        <div className="flex-1 space-y-1.5 min-w-0 max-h-[200px] overflow-y-auto">
          {data.map((item, i) => (
            <div key={item.sector} className="flex items-center gap-2 text-xs">
              <span
                className="h-2.5 w-2.5 rounded-sm shrink-0"
                style={{ backgroundColor: COLORS_HEX[i % COLORS_HEX.length] }}
              />
              <span className="truncate text-text-secondary flex-1">{item.sector}</span>
              <span className="text-text-tertiary tabular-nums shrink-0">{item.weight.toFixed(1)}%</span>
              <span className="text-text-muted tabular-nums shrink-0">{formatCurrency(item.value)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
