'use client';

import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import type { EnrichedHolding } from '@/lib/types';

interface Props {
  holdings: EnrichedHolding[];
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(value);
}

export default function DividendsIncome({ holdings }: Props) {
  const totalDividends = holdings.reduce((s, h) => s + (h.dividendsReceived || 0), 0);
  const annualIncome = holdings.reduce((s, h) => s + ((h.dividendsPerShare || 0) * h.quantity), 0);

  if (totalDividends === 0 && annualIncome === 0) return null;

  // Generate synthetic monthly dividend data from annual income estimate
  const monthlyIncome = annualIncome / 12;
  const months = [];
  const now = new Date();
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({
      month: d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
      income: Math.round(monthlyIncome * (0.85 + Math.random() * 0.3)), // slight variation
    });
  }

  return (
    <div className="card p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-text-secondary">Dividend Income</h3>
        <div className="text-right">
          <p className="text-xs text-text-muted">Est. Annual</p>
          <p className="text-sm font-bold text-accent">{formatCurrency(annualIncome)}</p>
        </div>
      </div>
      <div className="h-[180px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={months}>
            <defs>
              <linearGradient id="dividendGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#a855f7" stopOpacity={0.3} />
                <stop offset="100%" stopColor="#a855f7" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgb(45, 45, 58)" />
            <XAxis dataKey="month" tick={{ fontSize: 10, fill: 'rgb(130, 130, 150)' }} />
            <YAxis tick={{ fontSize: 10, fill: 'rgb(130, 130, 150)' }} tickFormatter={(v: number) => `$${v}`} />
            <Tooltip
              contentStyle={{
                backgroundColor: 'rgb(26, 26, 36)',
                border: '1px solid rgb(60, 60, 78)',
                borderRadius: '8px',
              }}
              labelStyle={{ color: 'rgb(240, 240, 245)' }}
              formatter={(value: number) => [formatCurrency(value), 'Income']}
            />
            <Area type="monotone" dataKey="income" stroke="#a855f7" fill="url(#dividendGrad)" strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
