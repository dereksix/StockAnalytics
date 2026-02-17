'use client';

interface Props {
  periods?: string[];
  active: string;
  onChange: (period: string) => void;
}

const DEFAULT_PERIODS = ['1M', '3M', 'YTD', '1Y', '5Y', 'All'];

export default function TimePeriodSelector({ periods = DEFAULT_PERIODS, active, onChange }: Props) {
  return (
    <div className="flex items-center gap-0.5 rounded-lg bg-elevated p-0.5">
      {periods.map(p => (
        <button
          key={p}
          onClick={() => onChange(p)}
          className={`rounded-md px-3 py-1 text-xs font-medium transition-all duration-150 ${
            active === p
              ? 'bg-accent text-white'
              : 'text-text-tertiary hover:text-text-primary'
          }`}
        >
          {p}
        </button>
      ))}
    </div>
  );
}
