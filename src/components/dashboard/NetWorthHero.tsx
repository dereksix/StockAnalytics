'use client';

import { TrendingUp, TrendingDown } from 'lucide-react';

interface Props {
  totalValue: number;
  totalGainLoss: number;
  totalGainLossPercent: number;
  dailyChange: number;
  dailyChangePercent: number;
  dividendYield: number;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(value);
}

function formatLargeCurrency(value: number): string {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}M`;
  if (value >= 100_000) return `$${(value / 1_000).toFixed(1)}K`;
  return formatCurrency(value);
}

export default function NetWorthHero({ totalValue, totalGainLoss, totalGainLossPercent, dailyChange, dailyChangePercent, dividendYield }: Props) {
  const isGain = totalGainLoss >= 0;
  const isDayGain = dailyChange >= 0;

  return (
    <div className="card-gradient-blue p-6 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-accent/5 rounded-full -translate-y-32 translate-x-32" />

      <div className="relative">
        <p className="text-sm text-text-tertiary font-medium">Net Worth</p>
        <p className="text-4xl font-bold text-text-primary mt-1 tracking-tight">
          {formatLargeCurrency(totalValue)}
        </p>

        <div className="flex flex-wrap items-center gap-4 mt-3">
          {/* Total gain/loss */}
          <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full ${isGain ? 'bg-gain/10' : 'bg-loss/10'}`}>
            {isGain ? <TrendingUp className="h-3.5 w-3.5 text-gain" /> : <TrendingDown className="h-3.5 w-3.5 text-loss" />}
            <span className={`text-sm font-semibold ${isGain ? 'text-gain' : 'text-loss'}`}>
              {formatCurrency(Math.abs(totalGainLoss))}
            </span>
            <span className={`text-xs ${isGain ? 'text-gain/70' : 'text-loss/70'}`}>
              ({totalGainLossPercent >= 0 ? '+' : ''}{totalGainLossPercent.toFixed(2)}%)
            </span>
          </div>

          {/* Daily change */}
          {dailyChange !== 0 && (
            <div className={`flex items-center gap-1 text-xs ${isDayGain ? 'text-gain' : 'text-loss'}`}>
              <span>Today:</span>
              <span className="font-medium">
                {isDayGain ? '+' : ''}{formatCurrency(dailyChange)} ({isDayGain ? '+' : ''}{dailyChangePercent.toFixed(2)}%)
              </span>
            </div>
          )}

          {/* Dividend yield */}
          {dividendYield > 0 && (
            <div className="flex items-center gap-1 text-xs text-text-tertiary">
              <span>Yield:</span>
              <span className="font-medium text-accent">{dividendYield.toFixed(2)}%</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
