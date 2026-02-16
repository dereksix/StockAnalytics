'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { ArrowLeft, RefreshCw } from 'lucide-react';
import PriceChart from '@/components/holding/PriceChart';
import TechnicalPanel from '@/components/holding/TechnicalPanel';
import RiskPanel from '@/components/holding/RiskPanel';
import MomentumGauge from '@/components/holding/MomentumGauge';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import MetricCard from '@/components/common/MetricCard';
import type { TechnicalSignals, RiskMetrics, MomentumScore, MarketQuote } from '@/lib/types';

interface HoldingDetail {
  symbol: string;
  description: string;
  quantity: number;
  costBasis: number;
  totalCostBasis: number;
  currentPrice: number;
  marketValue: number;
  gainLoss: number;
  gainLossPercent: number;
  sector: string;
  industry: string;
  accountType: string;
  accounts: { accountType: string; quantity: number; costBasis: number; marketValue: number }[];
}

interface HoldingData {
  holding: HoldingDetail;
  quote: MarketQuote | null;
  historicalData: { date: string; open: number; high: number; low: number; close: number; volume: number }[];
  analysis: {
    technicals: TechnicalSignals;
    risk: RiskMetrics;
    momentum: MomentumScore;
  } | null;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
}

function formatPercent(value: number): string {
  return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
}

export default function HoldingPage({ params }: { params: Promise<{ symbol: string }> }) {
  const resolvedParams = use(params);
  const symbol = resolvedParams.symbol.toUpperCase();
  const [data, setData] = useState<HoldingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        const res = await fetch(`/api/holdings/${symbol}`);
        const json = await res.json();
        if (res.ok) {
          setData(json);
          setError('');
        } else {
          setError(json.error || 'Failed to load holding');
        }
      } catch {
        setError('Failed to connect to server');
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [symbol]);

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="space-y-4 animate-fade-in">
        <Link href="/" className="inline-flex items-center gap-1 text-sm text-accent hover:text-accent-hover transition-colors">
          <ArrowLeft className="h-4 w-4" /> Back to Dashboard
        </Link>
        <div className="rounded-lg bg-loss/10 border border-loss/20 px-4 py-3 text-sm text-loss">
          {error || 'Holding not found'}
        </div>
      </div>
    );
  }

  const { holding, quote, historicalData, analysis } = data;
  const isGain = holding.gainLoss >= 0;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Back link + header */}
      <div>
        <Link href="/" className="inline-flex items-center gap-1 text-sm text-accent hover:text-accent-hover transition-colors">
          <ArrowLeft className="h-4 w-4" /> Back to Dashboard
        </Link>
        <div className="mt-2 flex items-baseline gap-3">
          <h1 className="text-2xl font-bold text-text-primary">{symbol}</h1>
          <span className="text-lg text-text-tertiary">{holding.description}</span>
        </div>
        {holding.sector && (
          <p className="text-sm text-text-muted">{holding.sector} — {holding.industry}</p>
        )}
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <MetricCard
          title="Current Price"
          value={formatCurrency(holding.currentPrice)}
          subtitle={quote ? `${formatPercent(quote.regularMarketChangePercent)} today` : undefined}
          trend={quote ? (quote.regularMarketChange >= 0 ? 'up' : 'down') : undefined}
          variant="accent"
        />
        <MetricCard
          title="Market Value"
          value={formatCurrency(holding.marketValue)}
          subtitle={`${holding.quantity} shares`}
        />
        <MetricCard
          title="Total Gain/Loss"
          value={formatCurrency(holding.gainLoss)}
          subtitle={formatPercent(holding.gainLossPercent)}
          trend={isGain ? 'up' : 'down'}
          variant={isGain ? 'gain' : 'loss'}
        />
        <MetricCard
          title="Cost Basis"
          value={formatCurrency(holding.costBasis)}
          subtitle={`Total: ${formatCurrency(holding.totalCostBasis)}`}
        />
      </div>

      {/* Charts and analysis */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <PriceChart
            data={historicalData}
            sma50={analysis?.technicals.sma50}
            sma200={analysis?.technicals.sma200}
            trailingStopPrice={analysis?.risk.trailingStopPrice}
          />
        </div>
        <div className="space-y-6">
          {analysis?.momentum && <MomentumGauge momentum={analysis.momentum} />}
          {analysis?.risk && <RiskPanel risk={analysis.risk} currentPrice={holding.currentPrice} />}
        </div>
      </div>

      {/* Technical panel */}
      {analysis?.technicals && (
        <TechnicalPanel technicals={analysis.technicals} currentPrice={holding.currentPrice} />
      )}

      {/* Account breakdown */}
      {holding.accounts.length > 1 && (
        <div className="card p-4">
          <h3 className="mb-3 text-sm font-semibold text-text-secondary">Account Breakdown</h3>
          <div className="space-y-2">
            {holding.accounts.map((acc, i) => (
              <div key={i} className="flex items-center justify-between rounded-lg bg-elevated px-3 py-2">
                <span className="text-sm font-medium text-text-secondary">{acc.accountType}</span>
                <div className="text-right">
                  <span className="text-sm text-text-secondary">{acc.quantity} shares</span>
                  <span className="ml-3 text-sm text-text-tertiary">{formatCurrency(acc.marketValue)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
