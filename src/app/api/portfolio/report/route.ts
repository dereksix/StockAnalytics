import { NextResponse } from 'next/server';
import { getPortfolioSnapshots } from '@/lib/db';

export async function GET() {
  try {
    const snapshots = (await getPortfolioSnapshots(365)) as unknown as {
      date: string;
      total_value: number;
      total_cost: number;
      snapshot_data: string;
    }[];

    const sorted = [...snapshots].sort((a, b) => a.date.localeCompare(b.date));

    // Group by month
    const monthMap = new Map<string, { values: number[]; costs: number[] }>();
    for (const s of sorted) {
      const ym = s.date.slice(0, 7);
      if (!monthMap.has(ym)) {
        monthMap.set(ym, { values: [], costs: [] });
      }
      monthMap.get(ym)!.values.push(s.total_value);
      monthMap.get(ym)!.costs.push(s.total_cost);
    }

    const months = Array.from(monthMap.entries()).sort((a, b) => a[0].localeCompare(b[0]));
    const monthly = months.map(([month, data], i) => {
      const lastValue = data.values[data.values.length - 1];
      const lastCost = data.costs[data.costs.length - 1];
      const prevValue = i > 0 ? months[i - 1][1].values[months[i - 1][1].values.length - 1] : lastCost;
      const profit = lastValue - prevValue;
      const profitPct = prevValue > 0 ? (profit / prevValue) * 100 : 0;

      return {
        month,
        portfolioValue: lastValue,
        profit,
        profitPct,
        dividends: 0, // would need per-snapshot dividend tracking
        tax: 0,
      };
    });

    return NextResponse.json({ monthly });
  } catch (error) {
    console.error('Report error:', error);
    return NextResponse.json({ error: 'Failed to fetch report data' }, { status: 500 });
  }
}
