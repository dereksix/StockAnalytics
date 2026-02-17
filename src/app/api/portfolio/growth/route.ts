import { NextRequest, NextResponse } from 'next/server';
import { getMarketData, getPortfolioSnapshots, getAllHoldings } from '@/lib/db';
import { getSPYData } from '@/lib/market-data';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || '1Y';

    // Get portfolio snapshots for portfolio value history
    const snapshots = (await getPortfolioSnapshots(365)) as unknown as {
      date: string;
      total_value: number;
      total_cost: number;
    }[];

    // Get SPY data for benchmark comparison
    let spyPeriod = '1y';
    switch (period) {
      case '1M': spyPeriod = '3m'; break;
      case '3M': spyPeriod = '3m'; break;
      case 'YTD': spyPeriod = '1y'; break;
      case '1Y': spyPeriod = '1y'; break;
      case '5Y': spyPeriod = '2y'; break;
      default: spyPeriod = '1y';
    }

    // Try to get SPY data from DB first, then fetch if needed
    let spyDataRaw = (await getMarketData('SPY', 365)) as unknown as {
      date: string;
      close: number;
    }[];

    if (spyDataRaw.length === 0) {
      // Fetch from market data
      const freshSpy = await getSPYData(spyPeriod);
      spyDataRaw = freshSpy.map(d => ({ date: d.date, close: d.close }));
    }

    // Build portfolio history from snapshots (normalize to % change)
    const sortedSnapshots = [...snapshots].sort((a, b) => a.date.localeCompare(b.date));
    const baseValue = sortedSnapshots.length > 0 ? sortedSnapshots[0].total_value : 0;
    const portfolioHistory = sortedSnapshots.map(s => ({
      date: s.date,
      value: baseValue > 0 ? ((s.total_value - baseValue) / baseValue) * 100 : 0,
    }));

    // Build SPY history (normalize to % change)
    const sortedSpy = [...spyDataRaw].sort((a, b) => a.date.localeCompare(b.date));
    const spyBase = sortedSpy.length > 0 ? sortedSpy[0].close : 0;
    const spyHistory = sortedSpy.map(s => ({
      date: s.date,
      value: spyBase > 0 ? ((s.close - spyBase) / spyBase) * 100 : 0,
    }));

    // Monthly returns from snapshots
    const monthlyReturns: { month: string; returnPct: number }[] = [];
    if (sortedSnapshots.length > 1) {
      const monthMap = new Map<string, { first: number; last: number }>();
      for (const s of sortedSnapshots) {
        const ym = s.date.slice(0, 7); // YYYY-MM
        if (!monthMap.has(ym)) {
          monthMap.set(ym, { first: s.total_value, last: s.total_value });
        } else {
          monthMap.get(ym)!.last = s.total_value;
        }
      }
      const months = Array.from(monthMap.entries()).sort((a, b) => a[0].localeCompare(b[0]));
      for (let i = 1; i < months.length; i++) {
        const prev = months[i - 1][1].last;
        const curr = months[i][1].last;
        monthlyReturns.push({
          month: months[i][0],
          returnPct: prev > 0 ? ((curr - prev) / prev) * 100 : 0,
        });
      }
    }

    // If no snapshots, generate synthetic data from current holdings
    if (portfolioHistory.length === 0) {
      const holdings = (await getAllHoldings()) as unknown as {
        symbol: string;
        market_value: number;
        total_cost_basis: number;
      }[];
      const totalValue = holdings.reduce((s, h) => s + (h.market_value || 0), 0);
      const totalCost = holdings.reduce((s, h) => s + (h.total_cost_basis || 0), 0);
      if (totalValue > 0) {
        const today = new Date().toISOString().split('T')[0];
        portfolioHistory.push({ date: today, value: totalCost > 0 ? ((totalValue - totalCost) / totalCost) * 100 : 0 });
      }
    }

    return NextResponse.json({
      portfolioHistory,
      spyHistory,
      monthlyReturns,
    });
  } catch (error) {
    console.error('Growth data error:', error);
    return NextResponse.json({ error: 'Failed to fetch growth data' }, { status: 500 });
  }
}
