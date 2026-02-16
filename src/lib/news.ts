import type { NewsItem } from './types';

const FINNHUB_BASE_URL = 'https://finnhub.io/api/v1';

export async function fetchCompanyNews(
  symbol: string,
  daysBack = 7
): Promise<NewsItem[]> {
  const apiKey = process.env.FINNHUB_API_KEY;
  if (!apiKey || apiKey === 'your_finnhub_api_key_here') {
    return [];
  }

  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - daysBack);

  const fromStr = from.toISOString().split('T')[0];
  const toStr = to.toISOString().split('T')[0];

  try {
    const res = await fetch(
      `${FINNHUB_BASE_URL}/company-news?symbol=${symbol}&from=${fromStr}&to=${toStr}&token=${apiKey}`
    );

    if (!res.ok) return [];

    const data = await res.json();

    if (!Array.isArray(data)) return [];

    return data.slice(0, 10).map((item: {
      id: number;
      headline: string;
      summary: string;
      source: string;
      url: string;
      datetime: number;
      related: string;
    }) => ({
      id: String(item.id),
      headline: item.headline,
      summary: item.summary,
      source: item.source,
      url: item.url,
      datetime: new Date(item.datetime * 1000).toISOString(),
      relatedSymbols: item.related ? item.related.split(',').map((s: string) => s.trim()) : [symbol],
    }));
  } catch (error) {
    console.error(`Failed to fetch news for ${symbol}:`, error);
    return [];
  }
}

export async function fetchNewsForSymbols(symbols: string[]): Promise<NewsItem[]> {
  const allNews: NewsItem[] = [];

  // Fetch sequentially to respect rate limits (60/min on free tier)
  for (const symbol of symbols.slice(0, 10)) {
    const news = await fetchCompanyNews(symbol);
    allNews.push(...news);
    // Small delay to respect rate limit
    await new Promise(r => setTimeout(r, 200));
  }

  // Deduplicate by headline
  const seen = new Set<string>();
  return allNews.filter(item => {
    if (seen.has(item.headline)) return false;
    seen.add(item.headline);
    return true;
  });
}
