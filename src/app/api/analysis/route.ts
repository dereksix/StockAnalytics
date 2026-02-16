import { NextResponse } from 'next/server';
import { getAllHoldings, upsertMarketData, upsertAnalysisCache } from '@/lib/db';
import { getHistoricalData, getSPYData } from '@/lib/market-data';
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

export async function POST() {
  try {
    const rows = (await getAllHoldings()) as unknown as HoldingRow[];
    if (rows.length === 0) {
      return NextResponse.json({ error: 'No holdings to analyze' }, { status: 400 });
    }

    const symbols = [...new Set(rows.map(r => r.symbol))];
    const totalPortfolioValue = rows.reduce((sum, r) => sum + (r.market_value as number), 0);

    // Sector totals
    const sectorTotals = new Map<string, number>();
    for (const r of rows) {
      const sector = (r.sector as string) || 'Unknown';
      sectorTotals.set(sector, (sectorTotals.get(sector) || 0) + (r.market_value as number));
    }

    // Fetch SPY data for relative strength
    const spyData = await getSPYData('1y');

    const results: { symbol: string; technicals: object; risk: object; momentum: object }[] = [];

    for (const symbol of symbols) {
      const historicalData = await getHistoricalData(symbol, '1y');

      if (historicalData.length > 0) {
        await upsertMarketData(symbol, historicalData);

        const technicals = computeTechnicals(symbol, historicalData, spyData);

        const holdingRow = rows.find(r => r.symbol === symbol);
        if (!holdingRow) continue;

        const sector = (holdingRow.sector as string) || 'Unknown';

        const risk = computeRiskMetrics({
          symbol,
          currentPrice: holdingRow.current_price as number,
          marketValue: holdingRow.market_value as number,
          totalPortfolioValue,
          sectorValue: holdingRow.market_value as number,
          totalSectorValue: sectorTotals.get(sector) || (holdingRow.market_value as number),
          atr14: technicals.atr14,
          historicalData,
        });

        const momentum = computeMomentum(technicals);

        await upsertAnalysisCache(symbol, technicals, risk, momentum);

        results.push({ symbol, technicals, risk, momentum });
      }

      await new Promise(r => setTimeout(r, 300));
    }

    return NextResponse.json({
      success: true,
      analyzed: results.length,
      results,
    });
  } catch (error) {
    console.error('Analysis error:', error);
    return NextResponse.json(
      { error: 'Failed to run analysis: ' + (error instanceof Error ? error.message : 'Unknown error') },
      { status: 500 }
    );
  }
}
