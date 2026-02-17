'use client';

import { useState, useEffect, useCallback } from 'react';
import { Upload, RefreshCw } from 'lucide-react';
import NetWorthHero from '@/components/dashboard/NetWorthHero';
import DayMovers from '@/components/dashboard/DayMovers';
import SectorPerformance from '@/components/dashboard/SectorPerformance';
import DividendsIncome from '@/components/dashboard/DividendsIncome';
import LatestNews from '@/components/dashboard/LatestNews';
import HoldingsTable from '@/components/dashboard/HoldingsTable';
import AllocationChart from '@/components/dashboard/AllocationChart';
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
    dailyChangeDollar: number;
    dailyChangePercent: number;
  };
  sectorBreakdown: { sector: string; value: number; weight: number }[];
  dividendSummary?: { totalAnnualIncome: number; averageYield: number };
}

export default function Dashboard() {
  const [portfolio, setPortfolio] = useState<PortfolioData | null>(null);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState('');
  const [importStatus, setImportStatus] = useState('');

  const fetchPortfolio = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/portfolio');
      const data = await res.json();
      if (res.ok) {
        setPortfolio(data);
        setError('');
      } else {
        setError(data.error || 'Failed to load portfolio');
      }
    } catch {
      setError('Failed to connect to server');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPortfolio();
  }, [fetchPortfolio]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    setImportStatus('Importing CSV and fetching live market data...');
    setError('');

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/import', { method: 'POST', body: formData });
      const data = await res.json();

      if (res.ok) {
        setImportStatus(`Imported ${data.holdingsImported} holdings. Enriching ${data.enriching} symbols in background...`);
        await fetchPortfolio();
      } else {
        setError(data.error || 'Import failed');
        setImportStatus('');
      }
    } catch {
      setError('Failed to upload file');
      setImportStatus('');
    } finally {
      setImporting(false);
      e.target.value = '';
    }
  };

  const handleRefreshData = async () => {
    setImporting(true);
    setImportStatus('Refreshing market data...');
    try {
      const res = await fetch('/api/market-data', { method: 'POST' });
      if (res.ok) {
        setImportStatus('Market data refreshed');
        await fetchPortfolio();
      }
    } catch {
      setError('Failed to refresh market data');
    } finally {
      setImporting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header with actions */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Dashboard</h1>
          <p className="text-sm text-text-tertiary">Portfolio overview</p>
        </div>
        <div className="flex items-center gap-3">
          <label className="cursor-pointer inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white shadow-glow-accent hover:bg-accent-hover transition-all duration-150">
            <Upload className="h-4 w-4" />
            {importing ? 'Importing...' : 'Import CSV'}
            <input
              type="file"
              accept=".csv"
              onChange={handleFileUpload}
              className="hidden"
              disabled={importing}
            />
          </label>
          {portfolio && portfolio.holdings.length > 0 && (
            <button
              onClick={handleRefreshData}
              disabled={importing}
              className="inline-flex items-center gap-2 rounded-lg border border-border-default bg-surface px-4 py-2 text-sm font-medium text-text-secondary shadow-card hover:bg-elevated transition-all duration-150 disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${importing ? 'animate-spin' : ''}`} />
              Refresh Data
            </button>
          )}
        </div>
      </div>

      {/* Status messages */}
      {importStatus && (
        <div className="rounded-lg bg-accent/10 border border-accent/20 px-4 py-3 text-sm text-accent">
          {importStatus}
        </div>
      )}
      {error && (
        <div className="rounded-lg bg-loss/10 border border-loss/20 px-4 py-3 text-sm text-loss">
          {error}
        </div>
      )}

      {/* Portfolio content */}
      {portfolio && portfolio.holdings.length > 0 ? (
        <>
          {/* Net Worth Hero */}
          <NetWorthHero
            totalValue={portfolio.summary.totalValue}
            totalGainLoss={portfolio.summary.totalGainLoss}
            totalGainLossPercent={portfolio.summary.totalGainLossPercent}
            dailyChange={portfolio.summary.dailyChangeDollar || 0}
            dailyChangePercent={portfolio.summary.dailyChangePercent || 0}
            dividendYield={portfolio.dividendSummary?.averageYield || 0}
          />

          {/* Allocation donut + Day Movers */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <AllocationChart data={portfolio.sectorBreakdown} />
            <DayMovers holdings={portfolio.holdings} />
          </div>

          {/* Sector Performance + Dividends */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <SectorPerformance holdings={portfolio.holdings} />
            <DividendsIncome holdings={portfolio.holdings} />
          </div>

          {/* Holdings Table (full width) */}
          <HoldingsTable holdings={portfolio.holdings} />

          {/* News */}
          <LatestNews />
        </>
      ) : (
        <div className="card-elevated rounded-xl border-2 border-dashed border-border-default p-12 text-center">
          <Upload className="mx-auto h-12 w-12 text-text-muted" />
          <h3 className="mt-4 text-lg font-semibold text-text-primary">No portfolio data</h3>
          <p className="mt-2 text-sm text-text-tertiary">
            Upload a Fidelity or Snowball CSV export to get started.
          </p>
        </div>
      )}
    </div>
  );
}
