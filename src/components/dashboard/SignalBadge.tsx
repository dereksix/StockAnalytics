'use client';

type SignalLevel = 'strong_buy' | 'buy' | 'hold' | 'caution' | 'sell' | string;

interface SignalBadgeProps {
  signal: SignalLevel;
  size?: 'sm' | 'md';
}

const signalConfig: Record<string, { label: string; bg: string; text: string; dot: string }> = {
  strong_buy: { label: 'Strong Buy', bg: 'bg-emerald-500/15', text: 'text-emerald-400', dot: 'bg-emerald-400' },
  buy: { label: 'Buy', bg: 'bg-green-500/15', text: 'text-green-400', dot: 'bg-green-400' },
  hold: { label: 'Hold', bg: 'bg-yellow-500/15', text: 'text-yellow-400', dot: 'bg-yellow-400' },
  caution: { label: 'Caution', bg: 'bg-orange-500/15', text: 'text-orange-400', dot: 'bg-orange-400' },
  sell: { label: 'Sell', bg: 'bg-red-500/15', text: 'text-red-400', dot: 'bg-red-400' },
};

export default function SignalBadge({ signal, size = 'sm' }: SignalBadgeProps) {
  const config = signalConfig[signal] || signalConfig.hold;
  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm';

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full font-medium ${config.bg} ${config.text} ${sizeClasses}`}>
      <span className={`inline-block h-1.5 w-1.5 rounded-full ${config.dot}`} />
      {config.label}
    </span>
  );
}
