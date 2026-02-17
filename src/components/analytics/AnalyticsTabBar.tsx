'use client';

export type AnalyticsTab = 'diversification' | 'dividends' | 'growth' | 'metrics' | 'report';

const tabs: { key: AnalyticsTab; label: string }[] = [
  { key: 'diversification', label: 'Diversification' },
  { key: 'dividends', label: 'Dividends' },
  { key: 'growth', label: 'Growth' },
  { key: 'metrics', label: 'Metrics' },
  { key: 'report', label: 'Report' },
];

interface Props {
  active: AnalyticsTab;
  onChange: (tab: AnalyticsTab) => void;
}

export default function AnalyticsTabBar({ active, onChange }: Props) {
  return (
    <div className="flex items-center gap-1 rounded-lg bg-surface border border-border-subtle p-1">
      {tabs.map(tab => (
        <button
          key={tab.key}
          onClick={() => onChange(tab.key)}
          className={`rounded-md px-4 py-1.5 text-sm font-medium transition-all duration-150 ${
            active === tab.key
              ? 'bg-accent text-white shadow-sm'
              : 'text-text-tertiary hover:text-text-primary hover:bg-active'
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
