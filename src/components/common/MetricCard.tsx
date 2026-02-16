'use client';

import { ReactNode } from 'react';

interface MetricCardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon?: ReactNode;
  trend?: 'up' | 'down' | 'neutral';
  variant?: 'default' | 'gain' | 'loss' | 'accent';
}

export default function MetricCard({ title, value, subtitle, icon, trend, variant = 'default' }: MetricCardProps) {
  const trendColor = trend === 'up' ? 'text-gain' : trend === 'down' ? 'text-loss' : 'text-text-primary';

  const cardClass = {
    default: 'card',
    gain: 'card-gradient-gain',
    loss: 'card-gradient-loss',
    accent: 'card-gradient-blue',
  }[variant];

  return (
    <div className={`${cardClass} p-4 transition-all duration-200 hover:shadow-card-hover hover:-translate-y-0.5`}>
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-wider text-text-tertiary">{title}</p>
        {icon && (
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/10 text-accent">
            {icon}
          </div>
        )}
      </div>
      <p className={`mt-2 text-2xl font-bold ${trendColor}`}>{value}</p>
      {subtitle && <p className="mt-1 text-sm text-text-tertiary">{subtitle}</p>}
    </div>
  );
}
