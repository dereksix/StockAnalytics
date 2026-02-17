'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { ArrowUpDown, Search } from 'lucide-react';
import CompanyLogo from '@/components/common/CompanyLogo';
import SignalBadge from './SignalBadge';
import type { EnrichedHolding } from '@/lib/types';

interface HoldingsTableProps {
  holdings: EnrichedHolding[];
}

type FilterTab = 'all' | 'stocks' | 'etf' | 'mutual';
type SortKey = 'symbol' | 'marketValue' | 'gainLossPercent' | 'portfolioWeight' | 'dailyChange' | 'score';
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
  const [filterTab, setFilterTab] = useState<FilterTab>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const totalValue = holdings.reduce((sum, h) => sum + h.marketValue, 0);

  const filtered = useMemo(() => {
    let result = holdings;

    // Filter by asset type
    if (filterTab === 'stocks') result = result.filter(h => !h.assetType || h.assetType === 'Stock');
    else if (filterTab === 'etf') result = result.filter(h => h.assetType === 'ETF');
    else if (filterTab === 'mutual') result = result.filter(h => h.assetType === 'Mutual Fund');

    // Search
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(h =>
        h.symbol.toLowerCase().includes(q) ||
        (h.description || '').toLowerCase().includes(q)
      );
    }

    return result;
  }, [holdings, filterTab, searchQuery]);

  const sorted = [...filtered].sort((a, b) => {
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
      case 'dailyChange':
        aVal = a.dailyChangePercent || 0; bVal = b.dailyChangePercent || 0; break;
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

  // Totals row
  const totalCost = sorted.reduce((s, h) => s + h.totalCostBasis, 0);
  const totalMarket = sorted.reduce((s, h) => s + h.marketValue, 0);
  const totalGainLoss = totalMarket - totalCost;

  const filterTabs: { key: FilterTab; label: string }[] = [
    { key: 'all', label: `Total (${holdings.length})` },
    { key: 'stocks', label: 'Stocks' },
    { key: 'etf', label: 'ETFs' },
    { key: 'mutual', label: 'Mutual' },
  ];

  return (
    <div className="card overflow-hidden">
      {/* Toolbar: filter tabs + search */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border-subtle px-4 py-3">
        <div className="flex items-center gap-1">
          {filterTabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setFilterTab(tab.key)}
              className={`rounded-md px-3 py-1 text-xs font-medium transition-all duration-150 ${
                filterTab === tab.key
                  ? 'bg-accent/15 text-accent'
                  : 'text-text-muted hover:text-text-secondary hover:bg-active'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-text-muted" />
          <input
            type="text"
            placeholder="Search..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="h-7 w-44 rounded-md border border-border-subtle bg-elevated pl-8 pr-3 text-xs text-text-primary placeholder:text-text-muted focus:border-accent focus:outline-none"
          />
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-border-subtle">
          <thead className="bg-elevated">
            <tr>
              <th className="px-4 py-3 text-left"><SortHeader label="Holding" sortKeyName="symbol" /></th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-text-tertiary">Shares</th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-text-tertiary">Price</th>
              <th className="px-4 py-3 text-right"><SortHeader label="Value" sortKeyName="marketValue" /></th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-text-tertiary">Cost Basis</th>
              <th className="px-4 py-3 text-right"><SortHeader label="Gain/Loss" sortKeyName="gainLossPercent" /></th>
              <th className="px-4 py-3 text-right"><SortHeader label="Day" sortKeyName="dailyChange" /></th>
              <th className="px-4 py-3 text-right"><SortHeader label="Weight" sortKeyName="portfolioWeight" /></th>
              <th className="px-4 py-3 text-center"><SortHeader label="Signal" sortKeyName="score" /></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-subtle/50">
            {sorted.map(holding => {
              const weight = totalValue > 0 ? (holding.marketValue / totalValue) * 100 : 0;
              const isGain = holding.gainLoss >= 0;
              const dailyPct = holding.dailyChangePercent || 0;
              const isDayGain = dailyPct >= 0;

              return (
                <tr key={`${holding.symbol}-${holding.accountType}`} className="hover:bg-elevated/50 transition-colors">
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2.5">
                      <CompanyLogo symbol={holding.symbol} size={28} />
                      <div>
                        <Link
                          href={`/holdings/${holding.symbol}`}
                          className="font-semibold text-sm text-accent hover:text-accent-hover transition-colors"
                        >
                          {holding.symbol}
                        </Link>
                        <p className="text-[11px] text-text-muted truncate max-w-[140px]">
                          {holding.description}
                          {holding.accountType && <span className="ml-1 opacity-60">({holding.accountType})</span>}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-2.5 text-right text-sm text-text-secondary tabular-nums">
                    {holding.quantity.toFixed(holding.quantity % 1 === 0 ? 0 : 4)}
                  </td>
                  <td className="px-4 py-2.5 text-right text-sm text-text-secondary tabular-nums">
                    {formatCurrency(holding.currentPrice)}
                  </td>
                  <td className="px-4 py-2.5 text-right text-sm font-medium text-text-primary tabular-nums">
                    {formatCurrency(holding.marketValue)}
                  </td>
                  <td className="px-4 py-2.5 text-right text-sm text-text-tertiary tabular-nums">
                    {formatCurrency(holding.totalCostBasis)}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <div className={`text-sm font-medium tabular-nums ${isGain ? 'text-gain' : 'text-loss'}`}>
                      {formatCurrency(holding.gainLoss)}
                    </div>
                    <div className={`text-xs tabular-nums ${isGain ? 'text-gain' : 'text-loss'}`}>
                      {formatPercent(holding.gainLossPercent)}
                    </div>
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    {dailyPct !== 0 ? (
                      <span className={`text-xs font-medium tabular-nums ${isDayGain ? 'text-gain' : 'text-loss'}`}>
                        {formatPercent(dailyPct)}
                      </span>
                    ) : (
                      <span className="text-xs text-text-muted">--</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-right">
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
                  <td className="px-4 py-2.5 text-center">
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
          {/* Totals footer */}
          {sorted.length > 0 && (
            <tfoot className="bg-elevated border-t-2 border-border-default">
              <tr>
                <td className="px-4 py-2.5 font-semibold text-sm text-text-primary">Total ({sorted.length})</td>
                <td className="px-4 py-2.5" />
                <td className="px-4 py-2.5" />
                <td className="px-4 py-2.5 text-right font-bold text-sm text-text-primary tabular-nums">{formatCurrency(totalMarket)}</td>
                <td className="px-4 py-2.5 text-right text-sm text-text-tertiary tabular-nums">{formatCurrency(totalCost)}</td>
                <td className="px-4 py-2.5 text-right">
                  <span className={`text-sm font-bold tabular-nums ${totalGainLoss >= 0 ? 'text-gain' : 'text-loss'}`}>
                    {formatCurrency(totalGainLoss)}
                  </span>
                </td>
                <td className="px-4 py-2.5" />
                <td className="px-4 py-2.5" />
                <td className="px-4 py-2.5" />
              </tr>
            </tfoot>
          )}
        </table>
      </div>
      {sorted.length === 0 && (
        <div className="px-4 py-12 text-center text-text-muted">
          {searchQuery ? 'No holdings match your search.' : 'No holdings imported yet. Upload a CSV to get started.'}
        </div>
      )}
    </div>
  );
}
