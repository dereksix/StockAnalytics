'use client';

import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, ReferenceLine } from 'recharts';
import CompanyLogo from '@/components/common/CompanyLogo';
import LoadingSpinner from '@/components/common/LoadingSpinner';

interface DipEntry {
  symbol: string;
  name: string;
  currentPrice: number;
  sma200: number;
  distancePercent: number;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(value);
}

export default function FindTheDipPage() {
  const [dips, setDips] = useState<DipEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchDips() {
      try {
        const res = await fetch('/api/tools/find-the-dip');
        if (res.ok) {
          const data = await res.json();
          setDips(data.dips || []);
        }
      } catch (e) {
        console.error('Failed to fetch dips:', e);
      } finally {
        setLoading(false);
      }
    }
    fetchDips();
  }, []);

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  const chartData = dips.map(d => ({
    symbol: d.symbol,
    distance: d.distancePercent,
  }));

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Find the Dip</h1>
        <p className="text-sm text-text-tertiary mt-1">
          Holdings below their 200-day moving average may represent buying opportunities
        </p>
      </div>

      {dips.length === 0 ? (
        <div className="card p-8 text-center text-text-muted">
          No data available. Refresh market data on the dashboard first to download historical prices.
        </div>
      ) : (
        <>
          {/* Bar chart */}
          <div className="card p-4">
            <h3 className="mb-3 text-sm font-semibold text-text-secondary">Distance from 200 SMA</h3>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="rgb(45, 45, 58)" />
                  <XAxis
                    type="number"
                    tick={{ fontSize: 10, fill: 'rgb(130, 130, 150)' }}
                    tickFormatter={(v: number) => `${v.toFixed(0)}%`}
                  />
                  <YAxis
                    type="category"
                    dataKey="symbol"
                    tick={{ fontSize: 11, fill: 'rgb(180, 180, 195)' }}
                    width={60}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'rgb(26, 26, 36)',
                      border: '1px solid rgb(60, 60, 78)',
                      borderRadius: '8px',
                    }}
                    labelStyle={{ color: 'rgb(240, 240, 245)' }}
                    formatter={(value: number) => [`${value.toFixed(2)}%`, 'Distance']}
                  />
                  <ReferenceLine x={0} stroke="rgb(90, 90, 110)" />
                  <Bar dataKey="distance" radius={[0, 2, 2, 0]}>
                    {chartData.map((entry, idx) => (
                      <Cell key={idx} fill={entry.distance < 0 ? '#f87171' : '#34d399'} opacity={0.8} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Table */}
          <div className="card overflow-x-auto">
            <table className="min-w-full divide-y divide-border-subtle">
              <thead className="bg-elevated">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-text-tertiary">Holding</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-text-tertiary">Current Price</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-text-tertiary">200 SMA</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-text-tertiary">Distance</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-text-tertiary">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle/50">
                {dips.map(d => {
                  const isBelow = d.distancePercent < 0;
                  const isFarBelow = d.distancePercent < -10;
                  return (
                    <tr key={d.symbol} className="hover:bg-elevated/50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <CompanyLogo symbol={d.symbol} size={28} />
                          <div>
                            <span className="font-medium text-text-primary text-sm">{d.symbol}</span>
                            <p className="text-xs text-text-muted truncate max-w-[180px]">{d.name}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right text-sm text-text-secondary tabular-nums">
                        {formatCurrency(d.currentPrice)}
                      </td>
                      <td className="px-4 py-3 text-right text-sm text-text-tertiary tabular-nums">
                        {formatCurrency(d.sma200)}
                      </td>
                      <td className={`px-4 py-3 text-right text-sm font-medium tabular-nums ${isBelow ? 'text-loss' : 'text-gain'}`}>
                        {d.distancePercent >= 0 ? '+' : ''}{d.distancePercent.toFixed(2)}%
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                          isFarBelow ? 'bg-loss/20 text-loss' :
                          isBelow ? 'bg-yellow-500/20 text-yellow-400' :
                          'bg-gain/20 text-gain'
                        }`}>
                          {isFarBelow ? 'Deep Dip' : isBelow ? 'Below SMA' : 'Above SMA'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
