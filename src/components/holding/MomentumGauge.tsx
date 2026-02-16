'use client';

import type { MomentumScore } from '@/lib/types';
import SignalBadge from '@/components/dashboard/SignalBadge';

interface MomentumGaugeProps {
  momentum: MomentumScore;
}

const trendLabels: Record<string, string> = {
  accelerating: 'Accelerating',
  steady: 'Steady',
  decelerating: 'Decelerating',
  rolling_over: 'Rolling Over',
};

const trendColors: Record<string, string> = {
  accelerating: 'text-gain',
  steady: 'text-accent',
  decelerating: 'text-yellow-400',
  rolling_over: 'text-loss',
};

export default function MomentumGauge({ momentum }: MomentumGaugeProps) {
  const { score, trend, signal } = momentum;

  // Normalize score from -100..+100 to 0..100 for gauge display
  const normalized = (score + 100) / 2;

  // Color based on score
  let gaugeColor: string;
  if (score >= 40) gaugeColor = '#34d399';
  else if (score >= 10) gaugeColor = '#6382ff';
  else if (score >= -10) gaugeColor = '#fbbf24';
  else if (score >= -40) gaugeColor = '#f97316';
  else gaugeColor = '#f87171';

  return (
    <div className="card p-4">
      <h3 className="mb-4 text-sm font-semibold text-text-secondary">Momentum</h3>

      <div className="flex flex-col items-center">
        {/* Score display */}
        <div className="relative mb-4">
          <svg width="160" height="90" viewBox="0 0 160 90">
            <defs>
              <filter id="gaugeGlow">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>
            {/* Background arc */}
            <path
              d="M 10 80 A 70 70 0 0 1 150 80"
              fill="none"
              stroke="rgb(40, 40, 52)"
              strokeWidth="12"
              strokeLinecap="round"
            />
            {/* Filled arc with glow */}
            <path
              d="M 10 80 A 70 70 0 0 1 150 80"
              fill="none"
              stroke={gaugeColor}
              strokeWidth="12"
              strokeLinecap="round"
              strokeDasharray={`${normalized * 2.2} 220`}
              filter="url(#gaugeGlow)"
            />
          </svg>
          <div className="absolute inset-0 flex items-end justify-center pb-1">
            <span className="text-3xl font-bold" style={{ color: gaugeColor }}>
              {score > 0 ? '+' : ''}{score}
            </span>
          </div>
        </div>

        {/* Trend and signal */}
        <div className="flex items-center gap-3">
          <span className={`text-sm font-medium ${trendColors[trend] || 'text-text-tertiary'}`}>
            {trendLabels[trend] || trend}
          </span>
          <SignalBadge signal={signal} size="md" />
        </div>

        {/* Scale labels */}
        <div className="mt-3 flex w-full justify-between text-xs text-text-muted">
          <span>-100 Bearish</span>
          <span>0 Neutral</span>
          <span>+100 Bullish</span>
        </div>
      </div>
    </div>
  );
}
