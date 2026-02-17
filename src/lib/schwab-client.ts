import { MarketQuote, HistoricalDataPoint } from './types';

const SCHWAB_API_URL = process.env.SCHWAB_API_URL || 'http://192.168.1.96:8080';
const SCHWAB_API_KEY = process.env.SCHWAB_API_KEY || '';

interface SchwabQuoteResponse {
  [symbol: string]: {
    quote: {
      symbol: string;
      lastPrice: number;
      netChange: number;
      netPercentChange: number;
      highPrice: number;
      lowPrice: number;
      totalVolume: number;
      '52WeekHigh': number;
      '52WeekLow': number;
      peRatio: number;
      divYield: number;
      divAmount: number;
      marketCap: number;
      [key: string]: unknown;
    };
    fundamental?: {
      peRatio: number;
      divYield: number;
      sector: string;
      industry: string;
      [key: string]: unknown;
    };
    reference?: {
      description: string;
      exchange: string;
      [key: string]: unknown;
    };
  };
}

interface SchwabCandleResponse {
  candles: {
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
    datetime: number; // epoch ms
  }[];
  symbol: string;
}

async function schwabFetch<T>(path: string): Promise<T> {
  const res = await fetch(`${SCHWAB_API_URL}${path}`, {
    headers: {
      'X-API-Key': SCHWAB_API_KEY,
      'Accept': 'application/json',
    },
  });
  if (!res.ok) {
    throw new Error(`Schwab API ${res.status}: ${res.statusText}`);
  }
  return res.json() as Promise<T>;
}

/**
 * Fetch batch quotes from Schwab API (max 50 symbols per request).
 * Splits large batches automatically with 2s delay between.
 */
export async function getSchwabQuotes(symbols: string[]): Promise<Map<string, MarketQuote>> {
  const quotes = new Map<string, MarketQuote>();
  const batchSize = 50;

  for (let i = 0; i < symbols.length; i += batchSize) {
    const batch = symbols.slice(i, i + batchSize);
    const symbolStr = batch.join(',');

    try {
      const data = await schwabFetch<SchwabQuoteResponse>(`/api/schwab/quotes?symbols=${symbolStr}`);

      for (const [sym, entry] of Object.entries(data)) {
        const q = entry.quote;
        const f = entry.fundamental;
        quotes.set(sym, {
          symbol: sym,
          regularMarketPrice: q.lastPrice || 0,
          regularMarketChange: q.netChange || 0,
          regularMarketChangePercent: q.netPercentChange || 0,
          regularMarketDayHigh: q.highPrice || 0,
          regularMarketDayLow: q.lowPrice || 0,
          regularMarketVolume: q.totalVolume || 0,
          fiftyTwoWeekHigh: q['52WeekHigh'] || 0,
          fiftyTwoWeekLow: q['52WeekLow'] || 0,
          marketCap: q.marketCap || 0,
          trailingPE: f?.peRatio || q.peRatio || 0,
          forwardPE: 0,
          dividendYield: f?.divYield || q.divYield || 0,
          sector: f?.sector || '',
          industry: f?.industry || '',
        });
      }
    } catch (error) {
      console.error(`[schwab] Batch quote failed for ${batch.length} symbols:`, error);
      throw error; // Let caller handle fallback
    }

    // 2s delay between batches
    if (i + batchSize < symbols.length) {
      await new Promise(r => setTimeout(r, 2000));
    }
  }

  return quotes;
}

/**
 * Fetch single quote from Schwab API.
 */
export async function getSchwabQuote(symbol: string): Promise<MarketQuote | null> {
  try {
    const quotes = await getSchwabQuotes([symbol]);
    return quotes.get(symbol) || null;
  } catch {
    return null;
  }
}

/**
 * Fetch price history from Schwab API.
 */
export async function getSchwabPriceHistory(
  symbol: string,
  periodType: string = 'year',
  period: number = 1,
  frequencyType: string = 'daily',
  frequency: number = 1
): Promise<HistoricalDataPoint[]> {
  try {
    const data = await schwabFetch<SchwabCandleResponse>(
      `/api/schwab/price-history?symbol=${symbol}&period_type=${periodType}&period=${period}&frequency_type=${frequencyType}&frequency=${frequency}`
    );

    if (!data?.candles) return [];

    return data.candles
      .filter(c => c.close !== null && c.close !== undefined)
      .map(c => ({
        date: new Date(c.datetime).toISOString().split('T')[0],
        open: c.open || 0,
        high: c.high || 0,
        low: c.low || 0,
        close: c.close || 0,
        volume: c.volume || 0,
      }));
  } catch (error) {
    console.error(`[schwab] Price history failed for ${symbol}:`, error);
    throw error;
  }
}

/**
 * Check if Schwab API is configured and reachable.
 */
export function isSchwabConfigured(): boolean {
  return !!SCHWAB_API_KEY && !!SCHWAB_API_URL;
}
