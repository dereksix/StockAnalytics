import { NextRequest, NextResponse } from 'next/server';
import { getHoldingBySymbol, getMarketData, getAnalysisCache, upsertMarketData, upsertAnalysisCache, getAllHoldings } from '@/lib/db';
import { getQuote, getHistoricalData, getSPYData } from '@/lib/market-data';
import { computeTechnicals } from '@/lib/technicals';
import { computeRiskMetrics } from '@/lib/risk-engine';
import { computeMomentum } from '@/lib/momentum';

interface HoldingRow {
  symbol: string;
  description: string;
  quantity: number;
  cost_basis: number;
  total_cost_basis: number;
  current_price: number;
  market_value: number;
  gain_loss: number;
  gain_loss_percent: number;
  sector: string;
  industry: string;
  account_type: string;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ symbol: string }> }
) {
  try {
    const { symbol } = await params;
    const upperSymbol = symbol.toUpperCase();

    const holdingRows = (await getHoldingBySymbol(upperSymbol)) as unknown as HoldingRow[];
    if (holdingRows.length === 0) {
      return NextResponse.json({ error: 'Holding not found' }, { status: 404 });
    }

    // Get fresh quote
    const quote = await getQuote(upperSymbol);

    // Get or fetch historical data
    let historicalData = (await getMarketData(upperSymbol, 365)) as unknown as { date: string; open: number; high: number; low: number; close: number; volume: number }[];

    if (historicalData.length < 50) {
      const freshData = await getHistoricalData(upperSymbol, '1y');
      if (freshData.length > 0) {
        await upsertMarketData(upperSymbol, freshData);
        historicalData = freshData as typeof historicalData;
      }
    }

    // Compute or get cached analysis
    let analysis = await getAnalysisCache(upperSymbol);

    if (!analysis && historicalData.length > 0) {
      const spyData = await getSPYData('1y');
      const mapped = historicalData.map(d => ({
        date: d.date as string,
        open: d.open as number,
        high: d.high as number,
        low: d.low as number,
        close: d.close as number,
        volume: d.volume as number,
      }));
      const technicals = computeTechnicals(upperSymbol, mapped, spyData);

      const allHoldings = (await getAllHoldings()) as unknown as HoldingRow[];
      const totalPortfolioValue = allHoldings.reduce((sum, r) => sum + (r.market_value as number), 0);
      const sectorTotals = new Map<string, number>();
      for (const r of allHoldings) {
        const sector = (r.sector as string) || 'Unknown';
        sectorTotals.set(sector, (sectorTotals.get(sector) || 0) + (r.market_value as number));
      }
      const row = holdingRows[0];
      const sector = (row.sector as string) || 'Unknown';

      const risk = computeRiskMetrics({
        symbol: upperSymbol,
        currentPrice: row.current_price as number,
        marketValue: row.market_value as number,
        totalPortfolioValue,
        sectorValue: row.market_value as number,
        totalSectorValue: sectorTotals.get(sector) || (row.market_value as number),
        atr14: technicals.atr14,
        historicalData: mapped,
      });

      const momentum = computeMomentum(technicals);
      await upsertAnalysisCache(upperSymbol, technicals, risk, momentum);
      analysis = { technicals, risk, momentum, lastUpdated: new Date().toISOString() };
    }

    // Build the holding object
    const primary = holdingRows[0];
    const holding = {
      symbol: upperSymbol,
      description: primary.description,
      quantity: holdingRows.reduce((sum, r) => sum + (r.quantity as number), 0),
      costBasis: primary.cost_basis,
      totalCostBasis: holdingRows.reduce((sum, r) => sum + (r.total_cost_basis as number), 0),
      currentPrice: quote?.regularMarketPrice || (primary.current_price as number),
      marketValue: holdingRows.reduce((sum, r) => sum + (r.market_value as number), 0),
      gainLoss: holdingRows.reduce((sum, r) => sum + (r.gain_loss as number), 0),
      gainLossPercent: primary.gain_loss_percent,
      sector: primary.sector,
      industry: primary.industry,
      accountType: primary.account_type,
      accounts: holdingRows.map(r => ({
        accountType: r.account_type,
        quantity: r.quantity,
        costBasis: r.cost_basis,
        marketValue: r.market_value,
      })),
    };

    return NextResponse.json({
      holding,
      quote,
      historicalData: (historicalData as { date: string }[]).sort((a, b) => (a.date as string).localeCompare(b.date as string)),
      analysis,
    });
  } catch (error) {
    console.error('Holding detail error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch holding details' },
      { status: 500 }
    );
  }
}
