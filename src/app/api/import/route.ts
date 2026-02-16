import { NextRequest, NextResponse } from 'next/server';
import { parseFidelityCSV } from '@/lib/csv-parser';
import { upsertHolding, clearHoldings } from '@/lib/db';
import { getQuotes } from '@/lib/market-data';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    const csvContent = await file.text();
    console.log('[import] File received:', file.name, 'size:', csvContent.length, 'chars');
    console.log('[import] First 200 chars:', csvContent.substring(0, 200));
    const holdings = parseFidelityCSV(csvContent);
    console.log('[import] Parsed holdings:', holdings.length);

    if (holdings.length === 0) {
      return NextResponse.json({ error: 'No holdings found in CSV' }, { status: 400 });
    }

    // Clear existing holdings and import fresh
    await clearHoldings();

    // Fetch live market data for all symbols
    const symbols = [...new Set(holdings.map(h => h.symbol))];
    const quotes = await getQuotes(symbols);

    // Enrich and save holdings
    for (const holding of holdings) {
      const quote = quotes.get(holding.symbol);
      const currentPrice = quote?.regularMarketPrice || holding.currentPrice;
      const marketValue = currentPrice * holding.quantity;
      const gainLoss = marketValue - holding.totalCostBasis;
      const gainLossPercent = holding.totalCostBasis > 0
        ? ((marketValue - holding.totalCostBasis) / holding.totalCostBasis) * 100
        : 0;

      await upsertHolding({
        symbol: holding.symbol,
        description: holding.description,
        quantity: holding.quantity,
        costBasis: holding.costBasis,
        totalCostBasis: holding.totalCostBasis,
        currentPrice,
        marketValue,
        gainLoss,
        gainLossPercent,
        sector: quote?.sector || '',
        industry: quote?.industry || '',
        accountType: holding.accountType,
      });
    }

    return NextResponse.json({
      success: true,
      holdingsImported: holdings.length,
      symbolsEnriched: quotes.size,
    });
  } catch (error) {
    console.error('Import error:', error);
    return NextResponse.json(
      { error: 'Failed to import CSV: ' + (error instanceof Error ? error.message : 'Unknown error') },
      { status: 500 }
    );
  }
}
