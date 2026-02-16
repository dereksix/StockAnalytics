import { NextRequest, NextResponse } from 'next/server';
import { getAllHoldings, getAnalysisCache } from '@/lib/db';
import { generateBriefing } from '@/lib/ai/briefing';
import type { EnrichedHolding } from '@/lib/types';

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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const forceRefresh = body.forceRefresh === true;

    const rows = (await getAllHoldings()) as unknown as HoldingRow[];
    if (rows.length === 0) {
      return NextResponse.json({ error: 'No holdings to analyze' }, { status: 400 });
    }

    // Build enriched holdings
    const holdings: EnrichedHolding[] = [];
    for (const row of rows) {
      const holding: EnrichedHolding = {
        symbol: row.symbol,
        description: row.description,
        quantity: row.quantity,
        costBasis: row.cost_basis,
        totalCostBasis: row.total_cost_basis,
        currentPrice: row.current_price,
        marketValue: row.market_value,
        gainLoss: row.gain_loss,
        gainLossPercent: row.gain_loss_percent,
        sector: row.sector,
        industry: row.industry,
        accountType: row.account_type,
      };

      const cache = await getAnalysisCache(row.symbol);
      if (cache) {
        Object.assign(holding, cache.technicals, cache.risk, cache.momentum);
      }

      holdings.push(holding);
    }

    const totalValue = holdings.reduce((sum, h) => sum + h.marketValue, 0);

    // Sector breakdown
    const sectorMap = new Map<string, number>();
    for (const h of holdings) {
      const sector = h.sector || 'Unknown';
      sectorMap.set(sector, (sectorMap.get(sector) || 0) + h.marketValue);
    }
    const sectorBreakdown = Array.from(sectorMap.entries())
      .map(([sector, value]) => ({
        sector,
        weight: totalValue > 0 ? (value / totalValue) * 100 : 0,
      }))
      .sort((a, b) => b.weight - a.weight);

    const briefing = await generateBriefing(holdings, totalValue, sectorBreakdown, forceRefresh);

    return NextResponse.json(briefing);
  } catch (error) {
    console.error('Briefing error:', error);
    return NextResponse.json(
      { error: 'Failed to generate briefing: ' + (error instanceof Error ? error.message : 'Unknown error') },
      { status: 500 }
    );
  }
}
