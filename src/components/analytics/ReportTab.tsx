'use client';

import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, ReferenceLine } from 'recharts';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import type { EnrichedHolding } from '@/lib/types';

interface Props {
  holdings: EnrichedHolding[];
  summary: { totalValue: number; totalCost: number };
}

interface ReportData {
  monthly: {
    month: string;
    portfolioValue: number;
    profit: number;
    profitPct: number;
    dividends: number;
    tax: number;
  }[];
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value);
}

export default function ReportTab({ holdings, summary }: Props) {
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchReport() {
      setLoading(true);
      try {
        const res = await fetch('/api/portfolio/report');
        if (res.ok) {
          setReportData(await res.json());
        }
      } catch (e) {
        console.error('Failed to fetch report:', e);
      } finally {
        setLoading(false);
      }
    }
    fetchReport();
  }, []);

  // Summary from current holdings
  const totalTax = holdings.reduce((s, h) => s + (h.tax || 0), 0);
  const totalDividends = holdings.reduce((s, h) => s + (h.dividendsReceived || 0), 0);
  const totalRealizedPnl = holdings.reduce((s, h) => s + (h.realizedPnl || 0), 0);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Summary row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="card p-4">
          <p className="text-xs text-text-muted">Unrealized P&L</p>
          <p className={`text-lg font-bold ${summary.totalValue - summary.totalCost >= 0 ? 'text-gain' : 'text-loss'}`}>
            {formatCurrency(summary.totalValue - summary.totalCost)}
          </p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-text-muted">Realized P&L</p>
          <p className={`text-lg font-bold ${totalRealizedPnl >= 0 ? 'text-gain' : 'text-loss'}`}>
            {formatCurrency(totalRealizedPnl)}
          </p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-text-muted">Dividends Received</p>
          <p className="text-lg font-bold text-gain">{formatCurrency(totalDividends)}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-text-muted">Tax</p>
          <p className="text-lg font-bold text-loss">{formatCurrency(totalTax)}</p>
        </div>
      </div>

      {/* Monthly profit chart */}
      {loading ? (
        <div className="flex justify-center py-16"><LoadingSpinner /></div>
      ) : reportData && reportData.monthly.length > 0 ? (
        <>
          <div className="card p-4">
            <h3 className="mb-3 text-sm font-semibold text-text-secondary">Monthly Profit</h3>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={reportData.monthly}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgb(45, 45, 58)" />
                  <XAxis dataKey="month" tick={{ fontSize: 10, fill: 'rgb(130, 130, 150)' }} />
                  <YAxis tick={{ fontSize: 10, fill: 'rgb(130, 130, 150)' }} tickFormatter={(v: number) => formatCurrency(v)} />
                  <Tooltip
                    contentStyle={{ backgroundColor: 'rgb(26, 26, 36)', border: '1px solid rgb(60, 60, 78)', borderRadius: '8px' }}
                    labelStyle={{ color: 'rgb(240, 240, 245)' }}
                    formatter={(value: number) => [formatCurrency(value), 'Profit']}
                  />
                  <ReferenceLine y={0} stroke="rgb(60, 60, 78)" />
                  <Bar dataKey="profit" radius={[2, 2, 0, 0]}>
                    {reportData.monthly.map((entry, idx) => (
                      <Cell key={idx} fill={entry.profit >= 0 ? '#34d399' : '#f87171'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Monthly report table */}
          <div className="card overflow-x-auto">
            <table className="min-w-full divide-y divide-border-subtle">
              <thead className="bg-elevated">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-text-tertiary">Month</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-text-tertiary">Portfolio Value</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-text-tertiary">Profit $</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-text-tertiary">Profit %</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-text-tertiary">Dividends</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-text-tertiary">Tax</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle/50">
                {reportData.monthly.map(row => (
                  <tr key={row.month} className="hover:bg-elevated/50 transition-colors">
                    <td className="px-4 py-2.5 text-sm font-medium text-text-primary">{row.month}</td>
                    <td className="px-4 py-2.5 text-right text-sm text-text-secondary tabular-nums">{formatCurrency(row.portfolioValue)}</td>
                    <td className={`px-4 py-2.5 text-right text-sm font-medium tabular-nums ${row.profit >= 0 ? 'text-gain' : 'text-loss'}`}>{formatCurrency(row.profit)}</td>
                    <td className={`px-4 py-2.5 text-right text-sm tabular-nums ${row.profitPct >= 0 ? 'text-gain' : 'text-loss'}`}>{row.profitPct.toFixed(2)}%</td>
                    <td className="px-4 py-2.5 text-right text-sm text-text-tertiary tabular-nums">{formatCurrency(row.dividends)}</td>
                    <td className="px-4 py-2.5 text-right text-sm text-text-tertiary tabular-nums">{formatCurrency(row.tax)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <div className="card p-8 text-center text-text-muted text-sm">
          Monthly report data requires portfolio snapshots. Import CSV and refresh data to start tracking.
        </div>
      )}
    </div>
  );
}
