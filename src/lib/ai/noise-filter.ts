import { getAnthropicClient, getModelId } from './client';
import { buildNoiseFilterPrompt } from './prompts';
import type { NewsItem } from '../types';

export async function filterNews(
  newsItems: NewsItem[],
  holdingSymbols: string[]
): Promise<NewsItem[]> {
  if (newsItems.length === 0) return [];

  const headlines = newsItems.map(item => ({
    headline: item.headline,
    source: item.source,
    symbols: item.relatedSymbols,
  }));

  const client = getAnthropicClient();
  const prompt = buildNoiseFilterPrompt(headlines, holdingSymbols);

  try {
    const response = await client.messages.create({
      model: getModelId('fast'),
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    });

    const text = response.content[0].type === 'text' ? response.content[0].text : '';
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return newsItems;

    const parsed = JSON.parse(jsonMatch[0]) as {
      relevant: { index: number; score: number; reason: string }[];
    };

    // Map back to news items with relevance scores
    const relevantItems: NewsItem[] = [];
    for (const r of parsed.relevant) {
      const idx = r.index - 1; // 1-indexed in prompt
      if (idx >= 0 && idx < newsItems.length) {
        relevantItems.push({
          ...newsItems[idx],
          relevanceScore: r.score,
        });
      }
    }

    return relevantItems.sort((a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0));
  } catch (error) {
    console.error('Noise filter error:', error);
    return newsItems; // Return unfiltered on error
  }
}
