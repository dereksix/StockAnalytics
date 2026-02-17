'use client';

import StatCard from '@/components/common/StatCard';
import DonutChart from '@/components/charts/DonutChart';
import type { EnrichedHolding } from '@/lib/types';

interface Props {
  holdings: EnrichedHolding[];
  summary: { totalValue: number; totalCost: number };
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(value);
}

export default function DividendsTab({ holdings, summary }: Props) {
  // Calculate dividend metrics
  const holdingsWithDividends = holdings.filter(h => (h.dividendYield || 0) > 0 || (h.dividendsReceived || 0) > 0);

  const totalDividendsReceived = holdings.reduce((sum, h) => sum + (h.dividendsReceived || 0), 0);
  const totalAnnualIncome = holdings.reduce((sum, h) => {
    const perShare = h.dividendsPerShare || 0;
    return sum + (perShare * h.quantity);
  }, 0);

  const weightedYield = summary.totalValue > 0
    ? holdings.reduce((sum, h) => sum + ((h.dividendYield || 0) * h.marketValue), 0) / summary.totalValue
    : 0;

  const weightedYieldOnCost = summary.totalCost > 0
    ? holdings.reduce((sum, h) => sum + ((h.dividendYieldOnCost || 0) * h.totalCostBasis), 0) / summary.totalCost
    : 0;

  // Income diversification donut
  const incomeData = holdingsWithDividends
    .map(h => {
      const income = (h.dividendsPerShare || 0) * h.quantity;
      return {
        name: h.symbol,
        value: income,
        weight: totalAnnualIncome > 0 ? (income / totalAnnualIncome) * 100 : 0,
      };
    })
    .filter(d => d.value > 0)
    .sort((a, b) => b.value - a.value);

  // Upcoming payments
  const upcomingPayments = holdings
    .filter(h => h.nextPaymentDate && h.nextPaymentAmount)
    .map(h => ({
      symbol: h.symbol,
      date: h.nextPaymentDate!,
      amount: h.nextPaymentAmount!,
      perShare: h.dividendsPerShare || 0,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Portfolio Yield"
          value={`${weightedYield.toFixed(2)}%`}
          subtitle="Weighted average"
          variant="accent"
        />
        <StatCard
          label="Annual Income"
          value={formatCurrency(totalAnnualIncome)}
          subtitle={`${formatCurrency(totalAnnualIncome / 12)}/month`}
          variant="gain"
        />
        <StatCard
          label="Yield on Cost"
          value={`${weightedYieldOnCost.toFixed(2)}%`}
          subtitle="Vs original investment"
        />
        <StatCard
          label="Dividends Received"
          value={formatCurrency(totalDividendsReceived)}
          subtitle={`${holdingsWithDividends.length} paying holdings`}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Income diversification */}
        <DonutChart
          data={incomeData}
          title="Income Diversification"
          centerLabel="Sources"
          centerValue={incomeData.length.toString()}
          topN={10}
        />

        {/* Upcoming payments */}
        <div className="card p-4">
          <h3 className="mb-3 text-sm font-semibold text-text-secondary">Upcoming Payments</h3>
          {upcomingPayments.length > 0 ? (
            <div className="space-y-2 max-h-[260px] overflow-y-auto">
              {upcomingPayments.map((p) => (
                <div key={`${p.symbol}-${p.date}`} className="flex items-center justify-between rounded-lg bg-elevated px-3 py-2">
                  <div>
                    <span className="text-sm font-medium text-text-primary">{p.symbol}</span>
                    <span className="ml-2 text-xs text-text-muted">{p.date}</span>
                  </div>
                  <span className="text-sm font-medium text-gain">{formatCurrency(p.amount)}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-text-muted py-8 text-center">No upcoming payment data available</p>
          )}
        </div>
      </div>

      {/* Dividend holdings table */}
      <div className="card overflow-x-auto">
        <table className="min-w-full divide-y divide-border-subtle">
          <thead className="bg-elevated">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-text-tertiary">Symbol</th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-text-tertiary">Yield</th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-text-tertiary">Yield on Cost</th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-text-tertiary">Per Share</th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-text-tertiary">Annual Income</th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-text-tertiary">Received</th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-text-tertiary">5Y Growth</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-subtle/50">
            {holdingsWithDividends.map(h => (
              <tr key={`${h.symbol}-${h.accountType}`} className="hover:bg-elevated/50 transition-colors">
                <td className="px-4 py-2.5 text-sm font-medium text-accent">{h.symbol}</td>
                <td className="px-4 py-2.5 text-right text-sm text-text-secondary tabular-nums">{(h.dividendYield || 0).toFixed(2)}%</td>
                <td className="px-4 py-2.5 text-right text-sm text-text-secondary tabular-nums">{(h.dividendYieldOnCost || 0).toFixed(2)}%</td>
                <td className="px-4 py-2.5 text-right text-sm text-text-secondary tabular-nums">{formatCurrency(h.dividendsPerShare || 0)}</td>
                <td className="px-4 py-2.5 text-right text-sm font-medium text-gain tabular-nums">{formatCurrency((h.dividendsPerShare || 0) * h.quantity)}</td>
                <td className="px-4 py-2.5 text-right text-sm text-text-tertiary tabular-nums">{formatCurrency(h.dividendsReceived || 0)}</td>
                <td className="px-4 py-2.5 text-right text-sm text-text-tertiary tabular-nums">
                  {(h.dividendGrowth5y || 0) !== 0 ? `${(h.dividendGrowth5y || 0).toFixed(1)}%` : '--'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {holdingsWithDividends.length === 0 && (
          <p className="px-4 py-8 text-center text-sm text-text-muted">No dividend data available. Import a Snowball CSV with dividend columns.</p>
        )}
      </div>
    </div>
  );
}
