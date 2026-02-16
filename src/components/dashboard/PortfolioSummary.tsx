'use client';

import MetricCard from '@/components/common/MetricCard';
import { DollarSign, TrendingUp, TrendingDown, BarChart3 } from 'lucide-react';

interface PortfolioSummaryProps {
  totalValue: number;
  totalCost: number;
  totalGainLoss: number;
  totalGainLossPercent: number;
  holdingCount: number;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatPercent(value: number): string {
  return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
}

export default function PortfolioSummary({
  totalValue,
  totalCost,
  totalGainLoss,
  totalGainLossPercent,
  holdingCount,
}: PortfolioSummaryProps) {
  const isGain = totalGainLoss >= 0;

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {[
        {
          title: 'Portfolio Value',
          value: formatCurrency(totalValue),
          icon: <DollarSign className="h-4 w-4" />,
          variant: 'accent' as const,
        },
        {
          title: 'Total Gain/Loss',
          value: formatCurrency(totalGainLoss),
          subtitle: formatPercent(totalGainLossPercent),
          icon: isGain ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />,
          trend: (isGain ? 'up' : 'down') as 'up' | 'down',
          variant: (isGain ? 'gain' : 'loss') as 'gain' | 'loss',
        },
        {
          title: 'Total Cost Basis',
          value: formatCurrency(totalCost),
          icon: <DollarSign className="h-4 w-4" />,
          variant: 'default' as const,
        },
        {
          title: 'Holdings',
          value: holdingCount.toString(),
          subtitle: 'Active positions',
          icon: <BarChart3 className="h-4 w-4" />,
          variant: 'default' as const,
        },
      ].map((card, i) => (
        <div
          key={card.title}
          className="animate-slide-up"
          style={{ animationDelay: `${i * 75}ms`, animationFillMode: 'both' }}
        >
          <MetricCard {...card} />
        </div>
      ))}
    </div>
  );
}
