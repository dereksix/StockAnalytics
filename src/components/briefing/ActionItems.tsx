'use client';

import type { ActionItem } from '@/lib/types';
import Link from 'next/link';

interface ActionItemsProps {
  actions: ActionItem[];
}

const actionLabels: Record<string, string> = {
  hold_strong: 'Hold Strong',
  tighten_stop: 'Tighten Stop',
  consider_trimming: 'Consider Trimming',
  add_on_dip: 'Add on Dip',
  watch_closely: 'Watch Closely',
};

const urgencyConfig: Record<string, { bg: string; text: string; dot: string }> = {
  high: { bg: 'bg-red-500/10 border-red-500/25', text: 'text-red-400', dot: 'bg-red-400' },
  medium: { bg: 'bg-yellow-500/10 border-yellow-500/25', text: 'text-yellow-400', dot: 'bg-yellow-400' },
  low: { bg: 'bg-emerald-500/10 border-emerald-500/25', text: 'text-emerald-400', dot: 'bg-emerald-400' },
};

export default function ActionItems({ actions }: ActionItemsProps) {
  if (actions.length === 0) return null;

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-text-secondary">Action Items</h3>
      {actions.map((action, i) => {
        const config = urgencyConfig[action.urgency] || urgencyConfig.low;
        return (
          <div key={i} className={`rounded-lg border p-4 ${config.bg}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className={`inline-block h-2 w-2 rounded-full ${config.dot}`} />
                <Link
                  href={`/holdings/${action.symbol}`}
                  className="font-semibold text-accent hover:text-accent-hover transition-colors"
                >
                  {action.symbol}
                </Link>
                <span className={`text-sm font-medium ${config.text}`}>
                  {actionLabels[action.action] || action.action}
                </span>
              </div>
              <span className={`text-xs font-medium uppercase ${config.text}`}>
                {action.urgency} urgency
              </span>
            </div>
            <p className="mt-1 text-sm text-text-tertiary">{action.reason}</p>
          </div>
        );
      })}
    </div>
  );
}
