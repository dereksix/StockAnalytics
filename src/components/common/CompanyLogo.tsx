'use client';

// Deterministic color from symbol string
function hashColor(str: string): string {
  const colors = [
    '#6382ff', '#34d399', '#fbbf24', '#f87171', '#a855f7',
    '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1',
    '#14b8a6', '#e879f9', '#facc15', '#fb923c', '#38bdf8',
  ];
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

interface Props {
  symbol: string;
  size?: number;
}

export default function CompanyLogo({ symbol, size = 32 }: Props) {
  const color = hashColor(symbol);
  const letter = symbol.charAt(0).toUpperCase();

  return (
    <div
      className="flex items-center justify-center rounded-lg font-bold text-white shrink-0"
      style={{
        width: size,
        height: size,
        backgroundColor: color,
        fontSize: size * 0.4,
      }}
    >
      {letter}
    </div>
  );
}
