'use client';

import type { EnrichedHolding } from '@/lib/types';

interface Props {
  holdings: EnrichedHolding[];
  summary: { totalValue: number };
}

interface MetricDef {
  title: string;
  value: number;
  displayValue: string;
  marketAvg: number;
  marketLabel: string;
  description: string;
  lowerIsBetter?: boolean;
}

function MetricSliderCard({ metric }: { metric: MetricDef }) {
  const { title, displayValue, marketAvg, marketLabel, description, value, lowerIsBetter } = metric;

  // Normalize to 0-100 scale for visual
  const maxVal = Math.max(Math.abs(value), Math.abs(marketAvg)) * 2 || 1;
  const portfolioPos = Math.min(Math.max(((value + maxVal) / (maxVal * 2)) * 100, 5), 95);
  const marketPos = Math.min(Math.max(((marketAvg + maxVal) / (maxVal * 2)) * 100, 5), 95);

  // Status badge
  let status: 'good' | 'neutral' | 'caution';
  if (lowerIsBetter) {
    status = value < marketAvg ? 'good' : value > marketAvg * 1.5 ? 'caution' : 'neutral';
  } else {
    status = value > marketAvg ? 'good' : value < marketAvg * 0.5 ? 'caution' : 'neutral';
  }
  const statusColors = {
    good: 'bg-gain/20 text-gain',
    neutral: 'bg-accent/20 text-accent',
    caution: 'bg-loss/20 text-loss',
  };
  const statusLabels = { good: 'Good', neutral: 'Neutral', caution: 'Caution' };

  return (
    <div className="card p-4">
      <div className="flex items-start justify-between mb-2">
        <div>
          <h4 className="text-sm font-medium text-text-primary">{title}</h4>
          <p className="text-xs text-text-muted mt-0.5">{description}</p>
        </div>
        <span className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full ${statusColors[status]}`}>
          {statusLabels[status]}
        </span>
      </div>
      <p className="text-2xl font-bold text-text-primary mb-3">{displayValue}</p>
      {/* Slider bar */}
      <div className="relative h-2 bg-elevated rounded-full mb-2">
        {/* Market average marker */}
        <div
          className="absolute top-0 h-2 w-0.5 bg-text-muted rounded-full"
          style={{ left: `${marketPos}%` }}
        />
        {/* Portfolio value */}
        <div
          className="absolute top-[-2px] h-3 w-3 rounded-full bg-accent border-2 border-surface"
          style={{ left: `${portfolioPos}%`, transform: 'translateX(-50%)' }}
        />
      </div>
      <div className="flex justify-between text-[10px] text-text-muted">
        <span>Portfolio: {displayValue}</span>
        <span>{marketLabel}: {typeof marketAvg === 'number' ? marketAvg.toFixed(2) : marketAvg}</span>
      </div>
    </div>
  );
}

export default function MetricsTab({ holdings, summary }: Props) {
  const totalValue = summary.totalValue;

  // Calculate weighted metrics from holdings data
  const weightedPE = totalValue > 0
    ? holdings.reduce((sum, h) => sum + ((h.peRatio || 0) * h.marketValue), 0) / totalValue
    : 0;

  const weightedBeta = totalValue > 0
    ? holdings.reduce((sum, h) => sum + ((h.beta || 0) * h.marketValue), 0) / totalValue
    : 0;

  const weightedDivYield = totalValue > 0
    ? holdings.reduce((sum, h) => sum + ((h.dividendYield || 0) * h.marketValue), 0) / totalValue
    : 0;

  const weightedExpenseRatio = totalValue > 0
    ? holdings.reduce((sum, h) => sum + ((h.expenseRatio || 0) * h.marketValue), 0) / totalValue
    : 0;

  // Simplified Sharpe / Sortino from available data
  const avgReturn = holdings.length > 0
    ? holdings.reduce((sum, h) => sum + h.gainLossPercent, 0) / holdings.length
    : 0;
  const returnStdDev = holdings.length > 1
    ? Math.sqrt(holdings.reduce((sum, h) => sum + Math.pow(h.gainLossPercent - avgReturn, 2), 0) / (holdings.length - 1))
    : 1;
  const riskFreeRate = 4.5; // approximate
  const sharpe = returnStdDev > 0 ? (avgReturn - riskFreeRate) / returnStdDev : 0;

  // Sortino: only downside deviation
  const downsideReturns = holdings.filter(h => h.gainLossPercent < riskFreeRate);
  const downsideDev = downsideReturns.length > 1
    ? Math.sqrt(downsideReturns.reduce((sum, h) => sum + Math.pow(h.gainLossPercent - riskFreeRate, 2), 0) / downsideReturns.length)
    : 1;
  const sortino = downsideDev > 0 ? (avgReturn - riskFreeRate) / downsideDev : 0;

  const metrics: MetricDef[] = [
    {
      title: 'Weighted P/E Ratio',
      value: weightedPE,
      displayValue: weightedPE.toFixed(1),
      marketAvg: 22,
      marketLabel: 'S&P 500 Avg',
      description: 'Price-to-earnings weighted by position size',
      lowerIsBetter: true,
    },
    {
      title: 'Portfolio Beta',
      value: weightedBeta,
      displayValue: weightedBeta.toFixed(2),
      marketAvg: 1.0,
      marketLabel: 'Market',
      description: 'Volatility relative to the market',
    },
    {
      title: 'Sharpe Ratio',
      value: sharpe,
      displayValue: sharpe.toFixed(2),
      marketAvg: 1.0,
      marketLabel: 'Good Benchmark',
      description: 'Risk-adjusted return (higher is better)',
    },
    {
      title: 'Sortino Ratio',
      value: sortino,
      displayValue: sortino.toFixed(2),
      marketAvg: 1.5,
      marketLabel: 'Good Benchmark',
      description: 'Downside risk-adjusted return',
    },
    {
      title: 'Dividend Yield',
      value: weightedDivYield,
      displayValue: `${weightedDivYield.toFixed(2)}%`,
      marketAvg: 1.3,
      marketLabel: 'S&P 500 Avg',
      description: 'Weighted average dividend yield',
    },
    {
      title: 'Expense Ratio',
      value: weightedExpenseRatio,
      displayValue: `${weightedExpenseRatio.toFixed(3)}%`,
      marketAvg: 0.5,
      marketLabel: 'ETF Average',
      description: 'Weighted average fund expense ratio',
      lowerIsBetter: true,
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {metrics.map(m => (
          <MetricSliderCard key={m.title} metric={m} />
        ))}
      </div>
    </div>
  );
}
