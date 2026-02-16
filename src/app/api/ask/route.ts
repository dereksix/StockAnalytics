import { NextRequest } from 'next/server';
import { getAllHoldings, getAnalysisCache } from '@/lib/db';
import { streamAskAboutPortfolio } from '@/lib/ai/ask';
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
    const { question } = await request.json();

    if (!question || typeof question !== 'string') {
      return new Response(JSON.stringify({ error: 'Question is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const rows = (await getAllHoldings()) as unknown as HoldingRow[];
    if (rows.length === 0) {
      return new Response(JSON.stringify({ error: 'No portfolio data. Import a CSV first.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
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

    const sectorMap = new Map<string, number>();
    for (const h of holdings) {
      const sector = h.sector || 'Unknown';
      sectorMap.set(sector, (sectorMap.get(sector) || 0) + h.marketValue);
    }
    const sectorBreakdown = Array.from(sectorMap.entries())
      .map(([sector, value]) => ({
        sector,
        weight: totalValue > 0 ? (value / totalValue) * 100 : 0,
      }));

    // Stream the response
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          const generator = streamAskAboutPortfolio(question, holdings, totalValue, sectorBreakdown);
          for await (const chunk of generator) {
            controller.enqueue(encoder.encode(chunk));
          }
          controller.close();
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Unknown error';
          controller.enqueue(encoder.encode(`\n\nError: ${message}`));
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Transfer-Encoding': 'chunked',
      },
    });
  } catch (error) {
    console.error('Ask error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to process question' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
