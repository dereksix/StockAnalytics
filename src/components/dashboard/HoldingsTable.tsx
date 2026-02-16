'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowUpDown } from 'lucide-react';
import SignalBadge from './SignalBadge';
import type { EnrichedHolding } from '@/lib/types';

interface HoldingsTableProps {
  holdings: EnrichedHolding[];
}

type SortKey = 'symbol' | 'marketValue' | 'gainLossPercent' | 'portfolioWeight' | 'score';
type SortDir = 'asc' | 'desc';

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(value);
}

function formatPercent(value: number): string {
  return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
}

export default function HoldingsTable({ holdings }: HoldingsTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>('marketValue');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  const totalValue = holdings.reduce((sum, h) => sum + h.marketValue, 0);

  const sorted = [...holdings].sort((a, b) => {
    let aVal: number, bVal: number;
    switch (sortKey) {
      case 'symbol':
        return sortDir === 'asc' ? a.symbol.localeCompare(b.symbol) : b.symbol.localeCompare(a.symbol);
      case 'marketValue':
        aVal = a.marketValue; bVal = b.marketValue; break;
      case 'gainLossPercent':
        aVal = a.gainLossPercent; bVal = b.gainLossPercent; break;
      case 'portfolioWeight':
        aVal = a.marketValue / totalValue; bVal = b.marketValue / totalValue; break;
      case 'score':
        aVal = a.score ?? 0; bVal = b.score ?? 0; break;
      default:
        aVal = a.marketValue; bVal = b.marketValue;
    }
    return sortDir === 'asc' ? aVal - bVal : bVal - aVal;
  });

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  };

  const SortHeader = ({ label, sortKeyName }: { label: string; sortKeyName: SortKey }) => (
    <button
      onClick={() => toggleSort(sortKeyName)}
      className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-text-tertiary hover:text-text-primary transition-colors"
    >
      {label}
      <ArrowUpDown className="h-3 w-3" />
    </button>
  );

  return (
    <div className="card overflow-x-auto">
      <table className="min-w-full divide-y divide-border-subtle">
        <thead className="bg-elevated">
          <tr>
            <th className="px-4 py-3 text-left"><SortHeader label="Symbol" sortKeyName="symbol" /></th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-text-tertiary">Description</th>
            <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-text-tertiary">Shares</th>
            <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-text-tertiary">Price</th>
            <th className="px-4 py-3 text-right"><SortHeader label="Value" sortKeyName="marketValue" /></th>
            <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-text-tertiary">Cost Basis</th>
            <th className="px-4 py-3 text-right"><SortHeader label="Gain/Loss" sortKeyName="gainLossPercent" /></th>
            <th className="px-4 py-3 text-right"><SortHeader label="Weight" sortKeyName="portfolioWeight" /></th>
            <th className="px-4 py-3 text-center"><SortHeader label="Signal" sortKeyName="score" /></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border-subtle/50">
          {sorted.map(holding => {
            const weight = totalValue > 0 ? (holding.marketValue / totalValue) * 100 : 0;
            const isGain = holding.gainLoss >= 0;

            return (
              <tr key={`${holding.symbol}-${holding.accountType}`} className="hover:bg-elevated/50 transition-colors">
                <td className="px-4 py-3">
                  <Link
                    href={`/holdings/${holding.symbol}`}
                    className="font-semibold text-accent hover:text-accent-hover transition-colors"
                  >
                    {holding.symbol}
                  </Link>
                  {holding.accountType && (
                    <span className="ml-2 text-xs text-text-muted">{holding.accountType}</span>
                  )}
                </td>
                <td className="px-4 py-3 text-sm text-text-tertiary max-w-[200px] truncate">
                  {holding.description}
                </td>
                <td className="px-4 py-3 text-right text-sm text-text-secondary tabular-nums">
                  {holding.quantity.toFixed(holding.quantity % 1 === 0 ? 0 : 4)}
                </td>
                <td className="px-4 py-3 text-right text-sm text-text-secondary tabular-nums">
                  {formatCurrency(holding.currentPrice)}
                </td>
                <td className="px-4 py-3 text-right text-sm font-medium text-text-primary tabular-nums">
                  {formatCurrency(holding.marketValue)}
                </td>
                <td className="px-4 py-3 text-right text-sm text-text-tertiary tabular-nums">
                  {formatCurrency(holding.totalCostBasis)}
                </td>
                <td className="px-4 py-3 text-right">
                  <div className={`text-sm font-medium tabular-nums ${isGain ? 'text-gain' : 'text-loss'}`}>
                    {formatCurrency(holding.gainLoss)}
                  </div>
                  <div className={`text-xs tabular-nums ${isGain ? 'text-gain' : 'text-loss'}`}>
                    {formatPercent(holding.gainLossPercent)}
                  </div>
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <span className="text-sm text-text-secondary tabular-nums">{weight.toFixed(1)}%</span>
                    <div className="h-1.5 w-12 rounded-full bg-elevated overflow-hidden">
                      <div
                        className="h-full rounded-full bg-accent/60"
                        style={{ width: `${Math.min(100, weight * 2.5)}%` }}
                      />
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-center">
                  {holding.signal ? (
                    <SignalBadge signal={holding.signal} />
                  ) : (
                    <span className="text-xs text-text-muted">--</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {sorted.length === 0 && (
        <div className="px-4 py-12 text-center text-text-muted">
          No holdings imported yet. Upload a Fidelity CSV to get started.
        </div>
      )}
    </div>
  );
}
