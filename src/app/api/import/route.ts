import { NextRequest, NextResponse } from 'next/server';
import { parseFidelityCSV } from '@/lib/csv-parser';
import { upsertHolding, clearHoldings } from '@/lib/db';
import { getQuotes } from '@/lib/market-data';

// Background enrichment — fire and forget
function enrichInBackground(symbols: string[]) {
  getQuotes(symbols).then(async (quotes) => {
    for (const [symbol, quote] of quotes) {
      try {
        await upsertHolding({
          symbol,
          description: '',
          quantity: 0,
          costBasis: 0,
          totalCostBasis: 0,
          currentPrice: quote.regularMarketPrice,
          marketValue: 0,
          gainLoss: 0,
          gainLossPercent: 0,
          sector: quote.sector || '',
          industry: quote.industry || '',
          accountType: '',
          _enrichOnly: true,
        });
      } catch (e) {
        console.error(`[enrich] Failed to update ${symbol}:`, e);
      }
    }
    console.log(`[enrich] Done — updated ${quotes.size} of ${symbols.length} symbols with live data`);
  }).catch((e) => {
    console.error('[enrich] Background enrichment failed:', e);
  });
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    const csvContent = await file.text();
    const holdings = parseFidelityCSV(csvContent);
    console.log('[import] Parsed', holdings.length, 'holdings from', file.name);

    if (holdings.length === 0) {
      return NextResponse.json({ error: 'No holdings found in CSV' }, { status: 400 });
    }

    // Clear existing holdings and save CSV data immediately
    await clearHoldings();

    for (const holding of holdings) {
      await upsertHolding({
        symbol: holding.symbol,
        description: holding.description,
        quantity: holding.quantity,
        costBasis: holding.costBasis,
        totalCostBasis: holding.totalCostBasis,
        currentPrice: holding.currentPrice,
        marketValue: holding.marketValue,
        gainLoss: holding.gainLoss,
        gainLossPercent: holding.gainLossPercent,
        sector: holding.sector || '',
        industry: '',
        accountType: holding.accountType,
      });
    }

    // Respond immediately — dashboard can paint now
    const symbols = [...new Set(holdings.map(h => h.symbol))];

    // Kick off Yahoo enrichment in the background
    enrichInBackground(symbols);

    return NextResponse.json({
      success: true,
      holdingsImported: holdings.length,
      enriching: symbols.length,
    });
  } catch (error) {
    console.error('Import error:', error);
    return NextResponse.json(
      { error: 'Failed to import CSV: ' + (error instanceof Error ? error.message : 'Unknown error') },
      { status: 500 }
    );
  }
}
