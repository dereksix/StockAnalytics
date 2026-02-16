import { NextResponse } from 'next/server';
import { getAllHoldings, getAnalysisCache } from '@/lib/db';
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
  last_updated: string;
}

export async function GET() {
  try {
    const rows = (await getAllHoldings()) as unknown as HoldingRow[];

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

      // Merge cached analysis if available
      const cache = await getAnalysisCache(row.symbol);
      if (cache) {
        Object.assign(holding, cache.technicals, cache.risk, cache.momentum);
      }

      holdings.push(holding);
    }

    // Aggregate portfolio stats
    const totalValue = holdings.reduce((sum, h) => sum + h.marketValue, 0);
    const totalCost = holdings.reduce((sum, h) => sum + h.totalCostBasis, 0);
    const totalGainLoss = totalValue - totalCost;
    const totalGainLossPercent = totalCost > 0 ? (totalGainLoss / totalCost) * 100 : 0;

    // Sector breakdown
    const sectorMap = new Map<string, number>();
    for (const h of holdings) {
      const sector = h.sector || 'Unknown';
      sectorMap.set(sector, (sectorMap.get(sector) || 0) + h.marketValue);
    }
    const sectorBreakdown = Array.from(sectorMap.entries())
      .map(([sector, value]) => ({
        sector,
        value,
        weight: totalValue > 0 ? (value / totalValue) * 100 : 0,
      }))
      .sort((a, b) => b.value - a.value);

    return NextResponse.json({
      holdings,
      summary: {
        totalValue,
        totalCost,
        totalGainLoss,
        totalGainLossPercent,
        holdingCount: holdings.length,
      },
      sectorBreakdown,
    });
  } catch (error) {
    console.error('Portfolio error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch portfolio' },
      { status: 500 }
    );
  }
}
