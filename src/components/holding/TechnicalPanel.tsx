'use client';

import type { TechnicalSignals } from '@/lib/types';

interface TechnicalPanelProps {
  technicals: TechnicalSignals;
  currentPrice: number;
}

function getRSIColor(rsi: number): string {
  if (rsi >= 70) return 'text-loss';
  if (rsi <= 30) return 'text-gain';
  return 'text-text-primary';
}

function getRSILabel(rsi: number): string {
  if (rsi >= 70) return 'Overbought';
  if (rsi <= 30) return 'Oversold';
  if (rsi >= 60) return 'Strong';
  if (rsi <= 40) return 'Weak';
  return 'Neutral';
}

function getRSIBarGradient(rsi: number): string {
  if (rsi >= 70) return 'bg-gradient-to-r from-amber-500 to-red-500';
  if (rsi <= 30) return 'bg-gradient-to-r from-emerald-500 to-emerald-400';
  if (rsi >= 50) return 'bg-gradient-to-r from-emerald-500 via-amber-400 to-amber-500';
  return 'bg-gradient-to-r from-emerald-500 to-blue-500';
}

export default function TechnicalPanel({ technicals, currentPrice }: TechnicalPanelProps) {
  const { rsi14, sma50, sma200, macd, atr14, priceVsSma50, priceVsSma200, goldenCross, deathCross, relativeStrengthVsSpy } = technicals;

  return (
    <div className="card p-4">
      <h3 className="mb-4 text-sm font-semibold text-text-secondary">Technical Indicators</h3>
      <div className="space-y-4">
        {/* RSI */}
        <div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-text-tertiary">RSI (14)</span>
            <span className={`text-sm font-semibold ${getRSIColor(rsi14)}`}>
              {rsi14.toFixed(1)} - {getRSILabel(rsi14)}
            </span>
          </div>
          <div className="mt-1 h-2.5 w-full rounded-full bg-elevated overflow-hidden">
            <div
              className={`h-full rounded-full ${getRSIBarGradient(rsi14)} transition-all duration-500`}
              style={{ width: `${Math.min(100, rsi14)}%` }}
            />
          </div>
          <div className="mt-0.5 flex justify-between text-xs text-text-muted">
            <span>Oversold</span>
            <span>Overbought</span>
          </div>
        </div>

        {/* Moving Averages */}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-lg bg-elevated p-3">
            <p className="text-xs text-text-muted">50 SMA</p>
            <p className="text-sm font-semibold text-text-primary">${sma50.toFixed(2)}</p>
            <p className={`text-xs ${priceVsSma50 >= 0 ? 'text-gain' : 'text-loss'}`}>
              {priceVsSma50 >= 0 ? '+' : ''}{priceVsSma50.toFixed(1)}% vs price
            </p>
          </div>
          <div className="rounded-lg bg-elevated p-3">
            <p className="text-xs text-text-muted">200 SMA</p>
            <p className="text-sm font-semibold text-text-primary">${sma200.toFixed(2)}</p>
            <p className={`text-xs ${priceVsSma200 >= 0 ? 'text-gain' : 'text-loss'}`}>
              {priceVsSma200 >= 0 ? '+' : ''}{priceVsSma200.toFixed(1)}% vs price
            </p>
          </div>
        </div>

        {/* Cross signals */}
        {(goldenCross || deathCross) && (
          <div className={`rounded-lg p-3 ${goldenCross ? 'bg-emerald-500/10 border border-emerald-500/20 text-gain' : 'bg-red-500/10 border border-red-500/20 text-loss'}`}>
            <p className="text-sm font-semibold">
              {goldenCross ? 'Golden Cross' : 'Death Cross'} Detected
            </p>
            <p className="text-xs opacity-80">
              {goldenCross
                ? '50 SMA crossed above 200 SMA — bullish signal'
                : '50 SMA crossed below 200 SMA — bearish signal'}
            </p>
          </div>
        )}

        {/* MACD */}
        <div className="rounded-lg bg-elevated p-3">
          <p className="text-xs text-text-muted">MACD</p>
          <div className="mt-1 grid grid-cols-3 gap-2 text-sm">
            <div>
              <p className="text-xs text-text-muted">MACD</p>
              <p className="font-medium text-text-primary">{macd.macd.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-xs text-text-muted">Signal</p>
              <p className="font-medium text-text-primary">{macd.signal.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-xs text-text-muted">Histogram</p>
              <p className={`font-medium text-lg ${macd.histogram >= 0 ? 'text-gain' : 'text-loss'}`}>
                {macd.histogram.toFixed(2)}
              </p>
            </div>
          </div>
        </div>

        {/* ATR and Relative Strength */}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-lg bg-elevated p-3">
            <p className="text-xs text-text-muted">ATR (14)</p>
            <p className="text-sm font-semibold text-text-primary">${atr14.toFixed(2)}</p>
            <p className="text-xs text-text-muted">
              {currentPrice > 0 ? ((atr14 / currentPrice) * 100).toFixed(1) : '0'}% of price
            </p>
          </div>
          <div className="rounded-lg bg-elevated p-3">
            <p className="text-xs text-text-muted">vs SPY (Relative)</p>
            <p className={`text-sm font-semibold ${relativeStrengthVsSpy >= 0 ? 'text-gain' : 'text-loss'}`}>
              {relativeStrengthVsSpy >= 0 ? '+' : ''}{relativeStrengthVsSpy.toFixed(1)}%
            </p>
            <p className="text-xs text-text-muted">
              {relativeStrengthVsSpy > 5 ? 'Outperforming' : relativeStrengthVsSpy < -5 ? 'Underperforming' : 'In line with'} S&P 500
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
