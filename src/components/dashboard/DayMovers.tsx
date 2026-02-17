'use client';

import CompanyLogo from '@/components/common/CompanyLogo';
import type { EnrichedHolding } from '@/lib/types';

interface Props {
  holdings: EnrichedHolding[];
}

function formatPercent(value: number): string {
  return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
}

function formatCurrency(value: number): string {
  return `${value >= 0 ? '+' : ''}$${Math.abs(value).toFixed(2)}`;
}

export default function DayMovers({ holdings }: Props) {
  const withDailyChange = holdings.filter(h => (h.dailyChangePercent || 0) !== 0);
  if (withDailyChange.length === 0) return null;

  const sorted = [...withDailyChange].sort((a, b) => (b.dailyChangePercent || 0) - (a.dailyChangePercent || 0));
  const gainers = sorted.filter(h => (h.dailyChangePercent || 0) > 0).slice(0, 5);
  const losers = sorted.filter(h => (h.dailyChangePercent || 0) < 0).reverse().slice(0, 5);

  const maxAbs = Math.max(
    ...withDailyChange.map(h => Math.abs(h.dailyChangePercent || 0)),
    0.01
  );

  const renderList = (items: EnrichedHolding[], isGainer: boolean) => (
    <div className="space-y-2">
      {items.map(h => {
        const pct = h.dailyChangePercent || 0;
        const width = (Math.abs(pct) / maxAbs) * 100;
        return (
          <div key={`${h.symbol}-${h.accountType}`} className="flex items-center gap-2">
            <CompanyLogo symbol={h.symbol} size={24} />
            <span className="text-xs font-medium text-text-secondary w-14 truncate">{h.symbol}</span>
            <div className="flex-1 h-5 bg-elevated rounded-sm overflow-hidden">
              <div
                className="h-full rounded-sm transition-all duration-500"
                style={{
                  width: `${Math.max(width, 4)}%`,
                  backgroundColor: isGainer ? 'rgb(52, 211, 153)' : 'rgb(248, 113, 113)',
                  opacity: 0.7,
                }}
              />
            </div>
            <div className="text-right w-24">
              <span className={`text-xs font-medium ${isGainer ? 'text-gain' : 'text-loss'}`}>
                {formatPercent(pct)}
              </span>
              <span className="text-[10px] text-text-muted ml-1">
                {formatCurrency(h.dailyChangeDollar || 0)}
              </span>
            </div>
          </div>
        );
      })}
      {items.length === 0 && (
        <p className="text-xs text-text-muted text-center py-4">None</p>
      )}
    </div>
  );

  return (
    <div className="card p-4">
      <h3 className="mb-3 text-sm font-semibold text-text-secondary">Day Movers</h3>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-xs font-medium text-gain mb-2">Top Gainers</p>
          {renderList(gainers, true)}
        </div>
        <div>
          <p className="text-xs font-medium text-loss mb-2">Top Losers</p>
          {renderList(losers, false)}
        </div>
      </div>
    </div>
  );
}
