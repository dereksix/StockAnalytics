import { NextRequest, NextResponse } from 'next/server';
import { parseFidelityCSV } from '@/lib/csv-parser';
import { upsertHolding, clearHoldings, savePortfolioSnapshot } from '@/lib/db';
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
        // Extended Snowball fields
        country: holding.country,
        currency: holding.currency,
        peRatio: holding.peRatio,
        eps: holding.eps,
        beta: holding.beta,
        expenseRatio: holding.expenseRatio,
        dividendYield: holding.dividendYield,
        dividendYieldOnCost: holding.dividendYieldOnCost,
        dividendsPerShare: holding.dividendsPerShare,
        dividendsReceived: holding.dividendsReceived,
        dividendGrowth5y: holding.dividendGrowth5y,
        nextPaymentDate: holding.nextPaymentDate,
        nextPaymentAmount: holding.nextPaymentAmount,
        exDividendDate: holding.exDividendDate,
        dailyChangeDollar: holding.dailyChangeDollar,
        dailyChangePercent: holding.dailyChangePercent,
        irr: holding.irr,
        realizedPnl: holding.realizedPnl,
        totalProfit: holding.totalProfit,
        totalProfitPercent: holding.totalProfitPercent,
        tax: holding.tax,
        portfolioSharePercent: holding.portfolioSharePercent,
        targetSharePercent: holding.targetSharePercent,
        category: holding.category,
        isin: holding.isin,
        assetType: holding.assetType,
      });
    }

    // Save portfolio snapshot
    const totalValue = holdings.reduce((sum, h) => sum + h.marketValue, 0);
    const totalCost = holdings.reduce((sum, h) => sum + h.totalCostBasis, 0);
    await savePortfolioSnapshot(totalValue, totalCost, {
      holdingCount: holdings.length,
      holdings: holdings.map(h => ({ symbol: h.symbol, value: h.marketValue, cost: h.totalCostBasis })),
    });

    // Respond immediately — dashboard can paint now
    const symbols = [...new Set(holdings.map(h => h.symbol))];

    // Kick off enrichment in the background
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
