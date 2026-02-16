'use client';

import { format, parseISO } from 'date-fns';
import { Activity, Eye, PieChart, AlertTriangle } from 'lucide-react';

interface BriefingCardProps {
  healthSummary: string;
  watchList: string;
  sectorObservations: string;
  riskWarnings: string;
  generatedAt: string;
  cached: boolean;
}

export default function BriefingCard({
  healthSummary,
  watchList,
  sectorObservations,
  riskWarnings,
  generatedAt,
  cached,
}: BriefingCardProps) {
  const formattedDate = (() => {
    try {
      return format(parseISO(generatedAt), 'MMM dd, yyyy h:mm a');
    } catch {
      return generatedAt;
    }
  })();

  const sections = [
    { title: 'Portfolio Health', icon: Activity, content: healthSummary, iconColor: 'text-gain' },
    { title: 'Holdings to Watch', icon: Eye, content: watchList, iconColor: 'text-accent' },
    { title: 'Sector Rotation', icon: PieChart, content: sectorObservations, iconColor: 'text-purple-400' },
  ];

  return (
    <div className="card">
      <div className="border-b border-border-subtle px-6 py-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-text-primary">Portfolio Briefing</h2>
          <div className="flex items-center gap-2">
            {cached && (
              <span className="rounded-full bg-active px-2 py-0.5 text-xs text-text-muted">
                Cached
              </span>
            )}
            <span className="text-xs text-text-muted">{formattedDate}</span>
          </div>
        </div>
      </div>

      <div className="space-y-6 p-6">
        {sections.map(({ title, icon: Icon, content, iconColor }) =>
          content ? (
            <div key={title}>
              <div className="mb-2 flex items-center gap-2">
                <Icon className={`h-4 w-4 ${iconColor}`} />
                <h3 className="text-sm font-semibold text-text-secondary">{title}</h3>
              </div>
              <p className="text-sm leading-relaxed text-text-tertiary">{content}</p>
            </div>
          ) : null
        )}

        {/* Risk Warnings */}
        {riskWarnings && riskWarnings !== 'None' && (
          <div className="rounded-lg bg-red-500/8 border border-red-500/20 p-4">
            <div className="mb-1 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-loss" />
              <h3 className="text-sm font-semibold text-loss">Risk Warnings</h3>
            </div>
            <p className="text-sm text-red-300">{riskWarnings}</p>
          </div>
        )}
      </div>
    </div>
  );
}
