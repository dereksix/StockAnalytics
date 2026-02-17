'use client';

import { useState, useEffect, useCallback } from 'react';
import AnalyticsTabBar, { AnalyticsTab } from '@/components/analytics/AnalyticsTabBar';
import DiversificationTab from '@/components/analytics/DiversificationTab';
import DividendsTab from '@/components/analytics/DividendsTab';
import GrowthTab from '@/components/analytics/GrowthTab';
import MetricsTab from '@/components/analytics/MetricsTab';
import ReportTab from '@/components/analytics/ReportTab';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import type { EnrichedHolding } from '@/lib/types';

interface PortfolioData {
  holdings: EnrichedHolding[];
  summary: {
    totalValue: number;
    totalCost: number;
    totalGainLoss: number;
    totalGainLossPercent: number;
    holdingCount: number;
  };
  sectorBreakdown: { sector: string; value: number; weight: number }[];
  countryBreakdown?: { country: string; value: number; weight: number }[];
  dividendSummary?: {
    totalAnnualIncome: number;
    averageYield: number;
    averageYieldOnCost: number;
  };
}

export default function AnalyticsPage() {
  const [tab, setTab] = useState<AnalyticsTab>('diversification');
  const [portfolio, setPortfolio] = useState<PortfolioData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchPortfolio = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/portfolio');
      if (res.ok) {
        const data = await res.json();
        setPortfolio(data);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPortfolio();
  }, [fetchPortfolio]);

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!portfolio || portfolio.holdings.length === 0) {
    return (
      <div className="text-center py-20 text-text-muted">
        No portfolio data. Import a CSV first.
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-text-primary">Analytics</h1>
        <AnalyticsTabBar active={tab} onChange={setTab} />
      </div>

      {tab === 'diversification' && <DiversificationTab portfolio={portfolio} />}
      {tab === 'dividends' && <DividendsTab holdings={portfolio.holdings} summary={portfolio.summary} />}
      {tab === 'growth' && <GrowthTab holdings={portfolio.holdings} summary={portfolio.summary} />}
      {tab === 'metrics' && <MetricsTab holdings={portfolio.holdings} summary={portfolio.summary} />}
      {tab === 'report' && <ReportTab holdings={portfolio.holdings} summary={portfolio.summary} />}
    </div>
  );
}
