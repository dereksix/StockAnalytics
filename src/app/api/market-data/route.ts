import { NextResponse } from 'next/server';
import { getAllHoldings, upsertHolding, upsertMarketData } from '@/lib/db';
import { getQuotes, getHistoricalData } from '@/lib/market-data';

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
      return NextResponse.json({ error: 'No holdings to refresh' }, { status: 400 });
    }

    const symbols = [...new Set(rows.map(r => r.symbol))];
    const quotes = await getQuotes(symbols);

    // Update holdings with fresh prices
    for (const row of rows) {
      const quote = quotes.get(row.symbol);
      if (!quote) continue;

      const currentPrice = quote.regularMarketPrice;
      const marketValue = currentPrice * row.quantity;
      const gainLoss = marketValue - row.total_cost_basis;
      const gainLossPercent = row.total_cost_basis > 0
        ? ((marketValue - row.total_cost_basis) / row.total_cost_basis) * 100
        : 0;

      await upsertHolding({
        symbol: row.symbol,
        description: row.description,
        quantity: row.quantity,
        costBasis: row.cost_basis,
        totalCostBasis: row.total_cost_basis,
        currentPrice,
        marketValue,
        gainLoss,
        gainLossPercent,
        sector: quote.sector || row.sector,
        industry: quote.industry || row.industry,
        accountType: row.account_type,
      });
    }

    // Fetch historical data for each symbol
    for (const symbol of symbols) {
      const history = await getHistoricalData(symbol, '1y');
      if (history.length > 0) {
        await upsertMarketData(symbol, history);
      }
    }

    return NextResponse.json({
      success: true,
      symbolsUpdated: quotes.size,
    });
  } catch (error) {
    console.error('Market data refresh error:', error);
    return NextResponse.json(
      { error: 'Failed to refresh market data' },
      { status: 500 }
    );
  }
}
