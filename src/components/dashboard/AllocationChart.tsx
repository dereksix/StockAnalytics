'use client';

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

interface AllocationChartProps {
  data: { sector: string; value: number; weight: number }[];
}

const COLORS = [
  'rgb(var(--chart-1))', 'rgb(var(--chart-2))', 'rgb(var(--chart-3))',
  'rgb(var(--chart-4))', 'rgb(var(--chart-5))', 'rgb(var(--chart-6))',
  'rgb(var(--chart-7))', 'rgb(var(--chart-8))', 'rgb(var(--chart-9))',
  'rgb(var(--chart-10))',
];

// Raw hex fallbacks for Recharts (doesn't parse CSS vars in all contexts)
const COLORS_HEX = [
  '#6382ff', '#34d399', '#fbbf24', '#f87171', '#a855f7',
  '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1',
];

function formatCurrency(value: number): string {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(1)}K`;
  return `$${value.toFixed(0)}`;
}

export default function AllocationChart({ data }: AllocationChartProps) {
  if (data.length === 0) return null;

  return (
    <div className="card p-4">
      <h3 className="mb-4 text-sm font-semibold text-text-secondary">Sector Allocation</h3>
      <div className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={100}
              paddingAngle={2}
              dataKey="value"
              nameKey="sector"
              label={({ sector, weight }) => `${sector} ${weight.toFixed(1)}%`}
              labelLine={true}
              stroke="rgb(var(--bg-surface))"
              strokeWidth={2}
            >
              {data.map((_, index) => (
                <Cell key={`cell-${index}`} fill={COLORS_HEX[index % COLORS_HEX.length]} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value: number) => formatCurrency(value)}
              labelFormatter={(label: string) => label}
              contentStyle={{
                backgroundColor: 'rgb(26, 26, 36)',
                border: '1px solid rgb(60, 60, 78)',
                borderRadius: '8px',
                color: 'rgb(240, 240, 245)',
              }}
              itemStyle={{ color: 'rgb(180, 180, 195)' }}
              labelStyle={{ color: 'rgb(240, 240, 245)' }}
            />
            <Legend
              wrapperStyle={{ color: 'rgb(180, 180, 195)' }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
