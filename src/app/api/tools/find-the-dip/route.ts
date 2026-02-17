import { NextResponse } from 'next/server';
import { getAllHoldings, getMarketData } from '@/lib/db';
import { SMA } from 'technicalindicators';

interface HoldingRow {
  symbol: string;
  description: string;
  current_price: number;
  market_value: number;
}

interface MarketDataRow {
  date: string;
  close: number;
}

export async function GET() {
  try {
    const holdings = (await getAllHoldings()) as unknown as HoldingRow[];

    const dips: {
      symbol: string;
      name: string;
      currentPrice: number;
      sma200: number;
      distancePercent: number;
    }[] = [];

    for (const h of holdings) {
      const marketData = (await getMarketData(h.symbol, 250)) as unknown as MarketDataRow[];
      if (marketData.length < 200) continue;

      const sorted = [...marketData].sort((a, b) => a.date.localeCompare(b.date));
      const closes = sorted.map(d => d.close);

      const sma200Values = SMA.calculate({ period: 200, values: closes });
      if (sma200Values.length === 0) continue;

      const latestSma200 = sma200Values[sma200Values.length - 1];
      const currentPrice = h.current_price || closes[closes.length - 1];

      if (latestSma200 > 0) {
        const distancePercent = ((currentPrice - latestSma200) / latestSma200) * 100;
        dips.push({
          symbol: h.symbol,
          name: h.description || h.symbol,
          currentPrice,
          sma200: latestSma200,
          distancePercent,
        });
      }
    }

    // Sort by distance (most below SMA first)
    dips.sort((a, b) => a.distancePercent - b.distancePercent);

    return NextResponse.json({ dips });
  } catch (error) {
    console.error('Find the dip error:', error);
    return NextResponse.json({ error: 'Failed to calculate dips' }, { status: 500 });
  }
}
