'use client';

interface Props {
  label: string;
  value: string;
  subtitle?: string;
  variant?: 'default' | 'gain' | 'loss' | 'accent';
}

export default function StatCard({ label, value, subtitle, variant = 'default' }: Props) {
  const valueColor = {
    default: 'text-text-primary',
    gain: 'text-gain',
    loss: 'text-loss',
    accent: 'text-accent',
  }[variant];

  return (
    <div className="card p-4">
      <p className="text-xs font-medium uppercase tracking-wider text-text-tertiary">{label}</p>
      <p className={`mt-1 text-xl font-bold ${valueColor}`}>{value}</p>
      {subtitle && <p className="mt-0.5 text-xs text-text-muted">{subtitle}</p>}
    </div>
  );
}
