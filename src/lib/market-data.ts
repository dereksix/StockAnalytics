import YahooFinance from 'yahoo-finance2';
import { MarketQuote, HistoricalDataPoint } from './types';
import { getSchwabQuotes, getSchwabQuote, getSchwabPriceHistory, isSchwabConfigured } from './schwab-client';

// Create an instance of yahoo-finance2
const yf = new YahooFinance();

// ─── Yahoo Finance fallback functions ─────────────────────────────────────────

async function getYahooQuote(symbol: string): Promise<MarketQuote | null> {
  try {
    const quote = await yf.quote(symbol) as Record<string, unknown>;
    if (!quote) return null;

    let sector = '';
    let industry = '';
    try {
      const profile = await (yf as unknown as { quoteSummary: (s: string, o: { modules: string[] }) => Promise<Record<string, Record<string, string>>> }).quoteSummary(symbol, { modules: ['assetProfile'] });
      sector = profile?.assetProfile?.sector || '';
      industry = profile?.assetProfile?.industry || '';
    } catch {
      // Some symbols (ETFs) may not have asset profiles
    }

    return {
      symbol,
      regularMarketPrice: (quote.regularMarketPrice as number) || 0,
      regularMarketChange: (quote.regularMarketChange as number) || 0,
      regularMarketChangePercent: (quote.regularMarketChangePercent as number) || 0,
      regularMarketDayHigh: (quote.regularMarketDayHigh as number) || 0,
      regularMarketDayLow: (quote.regularMarketDayLow as number) || 0,
      regularMarketVolume: (quote.regularMarketVolume as number) || 0,
      fiftyTwoWeekHigh: (quote.fiftyTwoWeekHigh as number) || 0,
      fiftyTwoWeekLow: (quote.fiftyTwoWeekLow as number) || 0,
      marketCap: (quote.marketCap as number) || 0,
      trailingPE: (quote.trailingPE as number) || 0,
      forwardPE: (quote.forwardPE as number) || 0,
      dividendYield: (quote.dividendYield as number) || 0,
      sector,
      industry,
    };
  } catch (error) {
    console.error(`[yahoo] Failed to fetch quote for ${symbol}:`, error);
    return null;
  }
}

async function getYahooQuotes(symbols: string[]): Promise<Map<string, MarketQuote>> {
  const quotes = new Map<string, MarketQuote>();
  const batchSize = 3;
  for (let i = 0; i < symbols.length; i += batchSize) {
    const batch = symbols.slice(i, i + batchSize);
    const results = await Promise.allSettled(batch.map(s => getYahooQuote(s)));
    results.forEach((result, idx) => {
      if (result.status === 'fulfilled' && result.value) {
        quotes.set(batch[idx], result.value);
      }
    });
    if (i + batchSize < symbols.length) {
      await new Promise(r => setTimeout(r, 2000));
    }
  }
  return quotes;
}

async function getYahooHistoricalData(symbol: string, period = '1y'): Promise<HistoricalDataPoint[]> {
  try {
    const endDate = new Date();
    const startDate = new Date();

    switch (period) {
      case '3m':
        startDate.setMonth(startDate.getMonth() - 3);
        break;
      case '6m':
        startDate.setMonth(startDate.getMonth() - 6);
        break;
      case '1y':
        startDate.setFullYear(startDate.getFullYear() - 1);
        break;
      case '2y':
        startDate.setFullYear(startDate.getFullYear() - 2);
        break;
      default:
        startDate.setFullYear(startDate.getFullYear() - 1);
    }

    const chartFn = (yf as unknown as {
      chart: (symbol: string, opts: { period1: Date; period2: Date; interval: string }) => Promise<{
        quotes: { date: Date; open: number; high: number; low: number; close: number; volume: number }[];
      }>;
    }).chart;

    if (typeof chartFn === 'function') {
      const result = await chartFn.call(yf, symbol, {
        period1: startDate,
        period2: endDate,
        interval: '1d',
      });

      if (!result?.quotes) return [];

      return result.quotes
        .filter((q) => q.close !== null && q.close !== undefined)
        .map((q) => ({
          date: new Date(q.date).toISOString().split('T')[0],
          open: q.open || 0,
          high: q.high || 0,
          low: q.low || 0,
          close: q.close || 0,
          volume: q.volume || 0,
        }));
    }

    const historicalFn = (yf as unknown as {
      historical: (symbol: string, opts: { period1: Date; period2: Date; interval: string }) => Promise<
        { date: Date; open: number; high: number; low: number; close: number; volume: number }[]
      >;
    }).historical;

    if (typeof historicalFn === 'function') {
      const result = await historicalFn.call(yf, symbol, {
        period1: startDate,
        period2: endDate,
        interval: '1d',
      });

      if (!result || !Array.isArray(result)) return [];

      return result
        .filter((q) => q.close !== null && q.close !== undefined)
        .map((q) => ({
          date: new Date(q.date).toISOString().split('T')[0],
          open: q.open || 0,
          high: q.high || 0,
          low: q.low || 0,
          close: q.close || 0,
          volume: q.volume || 0,
        }));
    }

    console.error(`[yahoo] No chart or historical method available for ${symbol}`);
    return [];
  } catch (error) {
    console.error(`[yahoo] Failed to fetch historical data for ${symbol}:`, error);
    return [];
  }
}

// ─── Public API: Schwab primary, Yahoo fallback ───────────────────────────────

export async function getQuote(symbol: string): Promise<MarketQuote | null> {
  if (isSchwabConfigured()) {
    try {
      const quote = await getSchwabQuote(symbol);
      if (quote) {
        console.log(`[market-data] Got quote for ${symbol} from Schwab`);
        return quote;
      }
    } catch (error) {
      console.warn(`[market-data] Schwab quote failed for ${symbol}, falling back to Yahoo:`, error);
    }
  }
  return getYahooQuote(symbol);
}

export async function getQuotes(symbols: string[]): Promise<Map<string, MarketQuote>> {
  if (isSchwabConfigured()) {
    try {
      const quotes = await getSchwabQuotes(symbols);
      if (quotes.size > 0) {
        console.log(`[market-data] Got ${quotes.size}/${symbols.length} quotes from Schwab`);
        // If Schwab returned most symbols, fill in missing ones from Yahoo
        const missing = symbols.filter(s => !quotes.has(s));
        if (missing.length > 0 && missing.length < symbols.length) {
          console.log(`[market-data] Fetching ${missing.length} missing symbols from Yahoo`);
          const yahooQuotes = await getYahooQuotes(missing);
          for (const [sym, q] of yahooQuotes) {
            quotes.set(sym, q);
          }
        }
        return quotes;
      }
    } catch (error) {
      console.warn(`[market-data] Schwab batch quotes failed, falling back to Yahoo:`, error);
    }
  }
  console.log(`[market-data] Using Yahoo for ${symbols.length} symbols`);
  return getYahooQuotes(symbols);
}

export async function getHistoricalData(
  symbol: string,
  period = '1y'
): Promise<HistoricalDataPoint[]> {
  if (isSchwabConfigured()) {
    try {
      // Map period string to Schwab API params
      let periodType = 'year';
      let periodNum = 1;
      switch (period) {
        case '3m': periodType = 'month'; periodNum = 3; break;
        case '6m': periodType = 'month'; periodNum = 6; break;
        case '1y': periodType = 'year'; periodNum = 1; break;
        case '2y': periodType = 'year'; periodNum = 2; break;
        case '5y': periodType = 'year'; periodNum = 5; break;
      }
      const data = await getSchwabPriceHistory(symbol, periodType, periodNum);
      if (data.length > 0) {
        console.log(`[market-data] Got ${data.length} candles for ${symbol} from Schwab`);
        return data;
      }
    } catch (error) {
      console.warn(`[market-data] Schwab history failed for ${symbol}, falling back to Yahoo:`, error);
    }
  }
  return getYahooHistoricalData(symbol, period);
}

export async function getSPYData(period = '1y'): Promise<HistoricalDataPoint[]> {
  return getHistoricalData('SPY', period);
}
