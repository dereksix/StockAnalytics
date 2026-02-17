'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import CompanyLogo from '@/components/common/CompanyLogo';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import type { EnrichedHolding } from '@/lib/types';

type SubTab = 'general' | 'dividends' | 'returns';

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(value);
}

function formatPercent(value: number): string {
  return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
}

export default function PortfolioPage() {
  const [holdings, setHoldings] = useState<EnrichedHolding[]>([]);
  const [loading, setLoading] = useState(true);
  const [subTab, setSubTab] = useState<SubTab>('general');

  const fetchPortfolio = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/portfolio');
      if (res.ok) {
        const data = await res.json();
        setHoldings(data.holdings || []);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPortfolio();
  }, [fetchPortfolio]);

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  const totalValue = holdings.reduce((s, h) => s + h.marketValue, 0);
  const totalCost = holdings.reduce((s, h) => s + h.totalCostBasis, 0);
  const totalGainLoss = totalValue - totalCost;
  const totalDividends = holdings.reduce((s, h) => s + (h.dividendsReceived || 0), 0);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-text-primary">Portfolio</h1>
        <div className="flex items-center gap-1 rounded-lg bg-surface border border-border-subtle p-1">
          {(['general', 'dividends', 'returns'] as const).map(t => (
            <button
              key={t}
              onClick={() => setSubTab(t)}
              className={`rounded-md px-4 py-1.5 text-sm font-medium capitalize transition-all duration-150 ${
                subTab === t ? 'bg-accent text-white shadow-sm' : 'text-text-tertiary hover:text-text-primary hover:bg-active'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="card overflow-x-auto">
        <table className="min-w-full divide-y divide-border-subtle">
          <thead className="bg-elevated">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-text-tertiary">Holding</th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-text-tertiary">Shares</th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-text-tertiary">Price</th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-text-tertiary">Value</th>
              {subTab === 'general' && (
                <>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-text-tertiary">Cost Basis</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-text-tertiary">Weight</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-text-tertiary">Sector</th>
                </>
              )}
              {subTab === 'dividends' && (
                <>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-text-tertiary">Yield</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-text-tertiary">Annual Income</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-text-tertiary">Received</th>
                </>
              )}
              {subTab === 'returns' && (
                <>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-text-tertiary">Gain/Loss $</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-text-tertiary">Gain/Loss %</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-text-tertiary">Daily Change</th>
                </>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-border-subtle/50">
            {holdings.map(h => {
              const weight = totalValue > 0 ? (h.marketValue / totalValue) * 100 : 0;
              const annualIncome = (h.dividendsPerShare || 0) * h.quantity;
              return (
                <tr key={`${h.symbol}-${h.accountType}`} className="hover:bg-elevated/50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <CompanyLogo symbol={h.symbol} size={28} />
                      <div>
                        <Link href={`/holdings/${h.symbol}`} className="font-medium text-sm text-accent hover:text-accent-hover transition-colors">
                          {h.symbol}
                        </Link>
                        <p className="text-xs text-text-muted truncate max-w-[160px]">{h.description}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-2.5 text-right text-sm text-text-secondary tabular-nums">
                    {h.quantity.toFixed(h.quantity % 1 === 0 ? 0 : 4)}
                  </td>
                  <td className="px-4 py-2.5 text-right text-sm text-text-secondary tabular-nums">{formatCurrency(h.currentPrice)}</td>
                  <td className="px-4 py-2.5 text-right text-sm font-medium text-text-primary tabular-nums">{formatCurrency(h.marketValue)}</td>

                  {subTab === 'general' && (
                    <>
                      <td className="px-4 py-2.5 text-right text-sm text-text-tertiary tabular-nums">{formatCurrency(h.totalCostBasis)}</td>
                      <td className="px-4 py-2.5 text-right text-sm text-text-secondary tabular-nums">{weight.toFixed(1)}%</td>
                      <td className="px-4 py-2.5 text-sm text-text-tertiary">{h.sector || '--'}</td>
                    </>
                  )}
                  {subTab === 'dividends' && (
                    <>
                      <td className="px-4 py-2.5 text-right text-sm text-text-secondary tabular-nums">{(h.dividendYield || 0).toFixed(2)}%</td>
                      <td className="px-4 py-2.5 text-right text-sm text-gain tabular-nums">{formatCurrency(annualIncome)}</td>
                      <td className="px-4 py-2.5 text-right text-sm text-text-tertiary tabular-nums">{formatCurrency(h.dividendsReceived || 0)}</td>
                    </>
                  )}
                  {subTab === 'returns' && (
                    <>
                      <td className={`px-4 py-2.5 text-right text-sm font-medium tabular-nums ${h.gainLoss >= 0 ? 'text-gain' : 'text-loss'}`}>
                        {formatCurrency(h.gainLoss)}
                      </td>
                      <td className={`px-4 py-2.5 text-right text-sm tabular-nums ${h.gainLossPercent >= 0 ? 'text-gain' : 'text-loss'}`}>
                        {formatPercent(h.gainLossPercent)}
                      </td>
                      <td className={`px-4 py-2.5 text-right text-sm tabular-nums ${(h.dailyChangePercent || 0) >= 0 ? 'text-gain' : 'text-loss'}`}>
                        {(h.dailyChangePercent || 0) !== 0 ? formatPercent(h.dailyChangePercent || 0) : '--'}
                      </td>
                    </>
                  )}
                </tr>
              );
            })}
          </tbody>
          {/* Totals row */}
          <tfoot className="bg-elevated border-t-2 border-border-default">
            <tr>
              <td className="px-4 py-3 font-semibold text-sm text-text-primary">Total ({holdings.length})</td>
              <td className="px-4 py-3" />
              <td className="px-4 py-3" />
              <td className="px-4 py-3 text-right font-bold text-sm text-text-primary tabular-nums">{formatCurrency(totalValue)}</td>
              {subTab === 'general' && (
                <>
                  <td className="px-4 py-3 text-right font-medium text-sm text-text-secondary tabular-nums">{formatCurrency(totalCost)}</td>
                  <td className="px-4 py-3 text-right text-sm text-text-secondary">100%</td>
                  <td className="px-4 py-3" />
                </>
              )}
              {subTab === 'dividends' && (
                <>
                  <td className="px-4 py-3" />
                  <td className="px-4 py-3 text-right font-medium text-sm text-gain tabular-nums">
                    {formatCurrency(holdings.reduce((s, h) => s + (h.dividendsPerShare || 0) * h.quantity, 0))}
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-sm text-text-tertiary tabular-nums">{formatCurrency(totalDividends)}</td>
                </>
              )}
              {subTab === 'returns' && (
                <>
                  <td className={`px-4 py-3 text-right font-bold text-sm tabular-nums ${totalGainLoss >= 0 ? 'text-gain' : 'text-loss'}`}>
                    {formatCurrency(totalGainLoss)}
                  </td>
                  <td className={`px-4 py-3 text-right font-medium text-sm tabular-nums ${totalGainLoss >= 0 ? 'text-gain' : 'text-loss'}`}>
                    {totalCost > 0 ? formatPercent((totalGainLoss / totalCost) * 100) : '--'}
                  </td>
                  <td className="px-4 py-3" />
                </>
              )}
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
