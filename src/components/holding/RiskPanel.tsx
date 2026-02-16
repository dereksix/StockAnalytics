'use client';

import type { RiskMetrics } from '@/lib/types';
import { AlertTriangle, Shield, ShieldAlert } from 'lucide-react';

interface RiskPanelProps {
  risk: RiskMetrics;
  currentPrice: number;
}

export default function RiskPanel({ risk, currentPrice }: RiskPanelProps) {
  const {
    trailingStopPrice,
    trailingStopPercent,
    portfolioWeight,
    sectorWeight,
    riskLevel,
    daysUntilLongTerm,
    nextEarningsDate,
  } = risk;

  const riskConfig = {
    low: { icon: Shield, color: 'text-gain', bg: 'bg-emerald-500/10 border-emerald-500/20', shadow: 'shadow-glow-gain', label: 'Low Risk' },
    medium: { icon: ShieldAlert, color: 'text-yellow-400', bg: 'bg-yellow-500/10 border-yellow-500/20', shadow: '', label: 'Medium Risk' },
    high: { icon: AlertTriangle, color: 'text-loss', bg: 'bg-red-500/10 border-red-500/20', shadow: 'shadow-glow-loss animate-pulse-glow', label: 'High Risk' },
  };

  const config = riskConfig[riskLevel];
  const RiskIcon = config.icon;

  const distanceToStop = currentPrice - trailingStopPrice;
  const distancePercent = currentPrice > 0 ? (distanceToStop / currentPrice) * 100 : 0;

  return (
    <div className="card p-4">
      <h3 className="mb-4 text-sm font-semibold text-text-secondary">Risk Assessment</h3>

      {/* Risk level badge */}
      <div className={`mb-4 flex items-center gap-2 rounded-lg border p-3 ${config.bg} ${config.shadow}`}>
        <RiskIcon className={`h-5 w-5 ${config.color}`} />
        <span className={`text-sm font-semibold ${config.color}`}>{config.label}</span>
      </div>

      <div className="space-y-4">
        {/* Trailing Stop */}
        <div className="rounded-lg bg-elevated p-3">
          <p className="text-xs font-medium text-text-muted">Trailing Stop (2x ATR)</p>
          <p className="text-lg font-bold text-loss">${trailingStopPrice.toFixed(2)}</p>
          <p className="text-xs text-text-muted">
            ${distanceToStop.toFixed(2)} ({distancePercent.toFixed(1)}%) below current price
          </p>
          <div className="mt-2 h-2 w-full rounded-full bg-active overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-accent to-loss"
              style={{ width: `${Math.min(100, Math.max(0, 100 - trailingStopPercent * 5))}%` }}
            />
          </div>
        </div>

        {/* Position sizing */}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-lg bg-elevated p-3">
            <p className="text-xs text-text-muted">Portfolio Weight</p>
            <p className={`text-sm font-semibold ${portfolioWeight > 20 ? 'text-loss' : portfolioWeight > 10 ? 'text-yellow-400' : 'text-text-primary'}`}>
              {portfolioWeight.toFixed(1)}%
            </p>
            {portfolioWeight > 15 && (
              <p className="text-xs text-orange-400">High concentration</p>
            )}
          </div>
          <div className="rounded-lg bg-elevated p-3">
            <p className="text-xs text-text-muted">Sector Weight</p>
            <p className="text-sm font-semibold text-text-primary">{sectorWeight.toFixed(1)}%</p>
          </div>
        </div>

        {/* Tax and Events */}
        {(daysUntilLongTerm !== null || nextEarningsDate) && (
          <div className="space-y-2">
            {daysUntilLongTerm !== null && (
              <div className="rounded-lg bg-amber-500/8 border border-amber-500/20 p-3">
                <p className="text-xs text-amber-400">
                  {daysUntilLongTerm} days until long-term capital gains
                </p>
              </div>
            )}
            {nextEarningsDate && (
              <div className="rounded-lg bg-accent/8 border border-accent/20 p-3">
                <p className="text-xs text-accent">
                  Earnings: {nextEarningsDate}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
