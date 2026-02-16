'use client';

import { useState } from 'react';
import { Brain, RefreshCw, Zap } from 'lucide-react';
import BriefingCard from '@/components/briefing/BriefingCard';
import ActionItems from '@/components/briefing/ActionItems';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import type { ActionItem } from '@/lib/types';

interface BriefingData {
  healthSummary: string;
  topActions: ActionItem[];
  watchList: string;
  sectorObservations: string;
  riskWarnings: string;
  generatedAt: string;
  cached: boolean;
}

export default function BriefingPage() {
  const [briefing, setBriefing] = useState<BriefingData | null>(null);
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');

  const runAnalysis = async () => {
    setAnalyzing(true);
    setStatus('Running technical analysis on all holdings...');
    try {
      const res = await fetch('/api/analysis', { method: 'POST' });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Analysis failed');
      }
      setStatus('Analysis complete. Generating briefing...');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Analysis failed');
      setAnalyzing(false);
      return false;
    }
    setAnalyzing(false);
    return true;
  };

  const generateBriefing = async (forceRefresh = false) => {
    setLoading(true);
    setError('');

    const analysisSuccess = await runAnalysis();
    if (!analysisSuccess) {
      setLoading(false);
      return;
    }

    setStatus('Generating AI briefing...');

    try {
      const res = await fetch('/api/briefing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ forceRefresh }),
      });
      const data = await res.json();

      if (res.ok) {
        setBriefing(data);
        setError('');
        setStatus('');
      } else {
        setError(data.error || 'Failed to generate briefing');
      }
    } catch {
      setError('Failed to connect to server');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">AI Briefing</h1>
          <p className="text-sm text-text-tertiary">
            AI-powered portfolio analysis and recommendations
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => generateBriefing(false)}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white shadow-glow-accent hover:bg-accent-hover transition-all duration-150 disabled:opacity-50"
          >
            {loading ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <Brain className="h-4 w-4" />
            )}
            {loading ? 'Generating...' : 'Generate Briefing'}
          </button>
          {briefing && (
            <button
              onClick={() => generateBriefing(true)}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-lg border border-border-default bg-surface px-4 py-2 text-sm font-medium text-text-secondary shadow-card hover:bg-elevated transition-all duration-150 disabled:opacity-50"
            >
              <Zap className="h-4 w-4" />
              Force Refresh
            </button>
          )}
        </div>
      </div>

      {status && (
        <div className="flex items-center gap-3 rounded-lg bg-accent/10 border border-accent/20 px-4 py-3 text-sm text-accent">
          <LoadingSpinner size="sm" />
          {status}
        </div>
      )}

      {error && (
        <div className="rounded-lg bg-loss/10 border border-loss/20 px-4 py-3 text-sm text-loss">{error}</div>
      )}

      {briefing ? (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <BriefingCard
              healthSummary={briefing.healthSummary}
              watchList={briefing.watchList}
              sectorObservations={briefing.sectorObservations}
              riskWarnings={briefing.riskWarnings}
              generatedAt={briefing.generatedAt}
              cached={briefing.cached}
            />
          </div>
          <div>
            <ActionItems actions={briefing.topActions} />
          </div>
        </div>
      ) : !loading ? (
        <div className="card-elevated rounded-xl border-2 border-dashed border-border-default p-12 text-center">
          <Brain className="mx-auto h-12 w-12 text-text-muted" />
          <h3 className="mt-4 text-lg font-semibold text-text-primary">No briefing generated yet</h3>
          <p className="mt-2 text-sm text-text-tertiary">
            Click &quot;Generate Briefing&quot; to run technical analysis and get AI-powered
            insights about your portfolio. Make sure you&apos;ve imported a CSV first.
          </p>
        </div>
      ) : null}
    </div>
  );
}
