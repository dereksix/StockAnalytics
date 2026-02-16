import { NextResponse } from 'next/server';
import { getAllHoldings } from '@/lib/db';
import { fetchNewsForSymbols } from '@/lib/news';
import { filterNews } from '@/lib/ai/noise-filter';

interface HoldingRow {
  symbol: string;
}

export async function GET() {
  try {
    const rows = (await getAllHoldings()) as unknown as HoldingRow[];
    if (rows.length === 0) {
      return NextResponse.json({ news: [] });
    }

    const symbols = [...new Set(rows.map(r => r.symbol as string))];
    const rawNews = await fetchNewsForSymbols(symbols);

    if (rawNews.length === 0) {
      return NextResponse.json({ news: [], filtered: false });
    }

    // Try AI filtering, fall back to raw news if API key not set
    let filteredNews = rawNews;
    let filtered = false;

    if (process.env.ANTHROPIC_API_KEY && process.env.ANTHROPIC_API_KEY !== 'your_anthropic_api_key_here') {
      try {
        filteredNews = await filterNews(rawNews, symbols);
        filtered = true;
      } catch {
        // Fall back to unfiltered
      }
    }

    return NextResponse.json({
      news: filteredNews,
      filtered,
      totalRaw: rawNews.length,
      totalFiltered: filteredNews.length,
    });
  } catch (error) {
    console.error('News error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch news' },
      { status: 500 }
    );
  }
}
