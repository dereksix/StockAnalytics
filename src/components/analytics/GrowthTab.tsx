'use client';

import { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell, ReferenceLine } from 'recharts';
import TimePeriodSelector from '@/components/common/TimePeriodSelector';
import HorizontalBarChart from '@/components/charts/HorizontalBarChart';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import type { EnrichedHolding } from '@/lib/types';

interface Props {
  holdings: EnrichedHolding[];
  summary: { totalValue: number; totalCost: number };
}

interface GrowthData {
  portfolioHistory: { date: string; value: number }[];
  spyHistory: { date: string; value: number }[];
  monthlyReturns: { month: string; returnPct: number }[];
}

function formatCurrency(value: number): string {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(1)}K`;
  return `$${value.toFixed(0)}`;
}

export default function GrowthTab({ holdings, summary }: Props) {
  const [period, setPeriod] = useState('1Y');
  const [growthData, setGrowthData] = useState<GrowthData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchGrowth() {
      setLoading(true);
      try {
        const res = await fetch(`/api/portfolio/growth?period=${period}`);
        if (res.ok) {
          setGrowthData(await res.json());
        }
      } catch (e) {
        console.error('Failed to fetch growth data:', e);
      } finally {
        setLoading(false);
      }
    }
    fetchGrowth();
  }, [period]);

  // Holdings performance from CSV data
  const holdingsPerformance = holdings
    .map(h => ({
      label: h.symbol,
      value: h.gainLossPercent,
    }))
    .sort((a, b) => b.value - a.value);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Portfolio vs Benchmark */}
      <div className="card p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-text-secondary">Portfolio Growth vs S&P 500</h3>
          <TimePeriodSelector active={period} onChange={setPeriod} />
        </div>
        {loading ? (
          <div className="flex justify-center py-16"><LoadingSpinner /></div>
        ) : growthData && growthData.portfolioHistory.length > 0 ? (
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              {(() => {
                // Merge portfolio and SPY data by date
                const dateMap = new Map<string, { date: string; portfolio?: number; spy?: number }>();
                for (const p of growthData.portfolioHistory) {
                  dateMap.set(p.date, { date: p.date, portfolio: p.value });
                }
                for (const s of growthData.spyHistory) {
                  const existing = dateMap.get(s.date);
                  if (existing) {
                    existing.spy = s.value;
                  } else {
                    dateMap.set(s.date, { date: s.date, spy: s.value });
                  }
                }
                const mergedData = Array.from(dateMap.values()).sort((a, b) => a.date.localeCompare(b.date));
                return (
                  <LineChart data={mergedData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgb(45, 45, 58)" />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 11, fill: 'rgb(130, 130, 150)' }}
                      tickFormatter={(d: string) => {
                        const date = new Date(d);
                        return `${date.getMonth() + 1}/${date.getDate()}`;
                      }}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: 'rgb(130, 130, 150)' }}
                      tickFormatter={(v: number) => `${v.toFixed(0)}%`}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'rgb(26, 26, 36)',
                        border: '1px solid rgb(60, 60, 78)',
                        borderRadius: '8px',
                      }}
                      labelStyle={{ color: 'rgb(240, 240, 245)' }}
                      formatter={(value: number, name: string) => [`${value.toFixed(2)}%`, name]}
                    />
                    <ReferenceLine y={0} stroke="rgb(60, 60, 78)" />
                    <Line
                      type="monotone"
                      dataKey="portfolio"
                      name="Portfolio"
                      stroke="#6382ff"
                      strokeWidth={2}
                      dot={false}
                      connectNulls
                    />
                    <Line
                      type="monotone"
                      dataKey="spy"
                      name="S&P 500"
                      stroke="#f87171"
                      strokeWidth={1.5}
                      dot={false}
                      strokeDasharray="4 4"
                      connectNulls
                    />
                  </LineChart>
                );
              })()}
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="text-center py-16 text-text-muted text-sm">
            Growth data requires market data refresh. Click &quot;Refresh Data&quot; on the dashboard first.
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Returns */}
        <div className="card p-4">
          <h3 className="mb-3 text-sm font-semibold text-text-secondary">Monthly Returns</h3>
          {growthData && growthData.monthlyReturns.length > 0 ? (
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={growthData.monthlyReturns}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgb(45, 45, 58)" />
                  <XAxis
                    dataKey="month"
                    tick={{ fontSize: 10, fill: 'rgb(130, 130, 150)' }}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: 'rgb(130, 130, 150)' }}
                    tickFormatter={(v: number) => `${v.toFixed(0)}%`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'rgb(26, 26, 36)',
                      border: '1px solid rgb(60, 60, 78)',
                      borderRadius: '8px',
                    }}
                    labelStyle={{ color: 'rgb(240, 240, 245)' }}
                    formatter={(value: number) => [`${value.toFixed(2)}%`, 'Return']}
                  />
                  <ReferenceLine y={0} stroke="rgb(60, 60, 78)" />
                  <Bar dataKey="returnPct" radius={[2, 2, 0, 0]}>
                    {growthData.monthlyReturns.map((entry, idx) => (
                      <Cell key={idx} fill={entry.returnPct >= 0 ? '#34d399' : '#f87171'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="text-center py-8 text-text-muted text-sm">No monthly data available</p>
          )}
        </div>

        {/* Holdings Performance */}
        <HorizontalBarChart
          data={holdingsPerformance}
          title="Holdings Performance"
          formatValue={(v) => `${v >= 0 ? '+' : ''}${v.toFixed(1)}%`}
        />
      </div>

      {/* Total gain/loss summary */}
      <div className="card p-4">
        <h3 className="mb-3 text-sm font-semibold text-text-secondary">Total Return Summary</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div>
            <p className="text-xs text-text-muted">Total Invested</p>
            <p className="text-lg font-bold text-text-primary">{formatCurrency(summary.totalCost)}</p>
          </div>
          <div>
            <p className="text-xs text-text-muted">Current Value</p>
            <p className="text-lg font-bold text-text-primary">{formatCurrency(summary.totalValue)}</p>
          </div>
          <div>
            <p className="text-xs text-text-muted">Total Gain/Loss</p>
            <p className={`text-lg font-bold ${summary.totalValue - summary.totalCost >= 0 ? 'text-gain' : 'text-loss'}`}>
              {formatCurrency(summary.totalValue - summary.totalCost)}
            </p>
          </div>
          <div>
            <p className="text-xs text-text-muted">Return %</p>
            <p className={`text-lg font-bold ${summary.totalValue - summary.totalCost >= 0 ? 'text-gain' : 'text-loss'}`}>
              {summary.totalCost > 0 ? `${(((summary.totalValue - summary.totalCost) / summary.totalCost) * 100).toFixed(2)}%` : '0%'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
