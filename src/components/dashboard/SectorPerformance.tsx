'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import type { EnrichedHolding } from '@/lib/types';

interface Props {
  holdings: EnrichedHolding[];
}

function formatCurrency(value: number): string {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(1)}K`;
  return `$${value.toFixed(0)}`;
}

export default function SectorPerformance({ holdings }: Props) {
  // Aggregate gain/loss by sector
  const sectorMap = new Map<string, { gainLoss: number; value: number }>();
  for (const h of holdings) {
    const sector = h.sector || 'Unknown';
    const existing = sectorMap.get(sector) || { gainLoss: 0, value: 0 };
    existing.gainLoss += h.gainLoss;
    existing.value += h.marketValue;
    sectorMap.set(sector, existing);
  }

  const data = Array.from(sectorMap.entries())
    .map(([sector, { gainLoss, value }]) => ({
      sector: sector.length > 15 ? sector.slice(0, 13) + '...' : sector,
      gainLoss,
      gainLossPct: value > 0 ? (gainLoss / value) * 100 : 0,
    }))
    .sort((a, b) => b.gainLoss - a.gainLoss);

  if (data.length === 0) return null;

  return (
    <div className="card p-4">
      <h3 className="mb-3 text-sm font-semibold text-text-secondary">Sector Performance</h3>
      <div className="h-[250px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke="rgb(45, 45, 58)" />
            <XAxis
              type="number"
              tick={{ fontSize: 10, fill: 'rgb(130, 130, 150)' }}
              tickFormatter={(v: number) => formatCurrency(v)}
            />
            <YAxis
              type="category"
              dataKey="sector"
              tick={{ fontSize: 10, fill: 'rgb(180, 180, 195)' }}
              width={100}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'rgb(26, 26, 36)',
                border: '1px solid rgb(60, 60, 78)',
                borderRadius: '8px',
              }}
              labelStyle={{ color: 'rgb(240, 240, 245)' }}
              formatter={(value: number) => [formatCurrency(value), 'Gain/Loss']}
            />
            <Bar dataKey="gainLoss" radius={[0, 2, 2, 0]}>
              {data.map((entry, idx) => (
                <Cell key={idx} fill={entry.gainLoss >= 0 ? '#34d399' : '#f87171'} opacity={0.8} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
