import { getAnthropicClient, getModelId } from './client';
import { buildBriefingPrompt } from './prompts';
import { saveBriefing, getLatestBriefing } from '../db';
import type { EnrichedHolding, ActionItem } from '../types';

interface BriefingResult {
  healthSummary: string;
  topActions: ActionItem[];
  watchList: string;
  sectorObservations: string;
  riskWarnings: string;
  generatedAt: string;
  cached: boolean;
}

export async function generateBriefing(
  holdings: EnrichedHolding[],
  totalValue: number,
  sectorBreakdown: { sector: string; weight: number }[],
  forceRefresh = false
): Promise<BriefingResult> {
  // Check cache (within last 24 hours)
  if (!forceRefresh) {
    const cached = await getLatestBriefing();
    if (cached) {
      const cacheAge = Date.now() - new Date(cached.generated_at).getTime();
      const oneDayMs = 24 * 60 * 60 * 1000;
      if (cacheAge < oneDayMs) {
        const content = JSON.parse(cached.content);
        const actionItems = JSON.parse(cached.action_items || '[]');
        return {
          ...content,
          topActions: actionItems,
          generatedAt: cached.generated_at,
          cached: true,
        };
      }
    }
  }

  const client = getAnthropicClient();
  const prompt = buildBriefingPrompt(holdings, totalValue, sectorBreakdown);

  const response = await client.messages.create({
    model: getModelId('fast'),
    max_tokens: 2048,
    messages: [{ role: 'user', content: prompt }],
  });

  const text = response.content[0].type === 'text' ? response.content[0].text : '';

  // Parse the JSON response
  let parsed: {
    healthSummary: string;
    topActions: ActionItem[];
    watchList: string;
    sectorObservations: string;
    riskWarnings: string;
  };

  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON found in response');
    parsed = JSON.parse(jsonMatch[0]);
  } catch {
    parsed = {
      healthSummary: text.slice(0, 500),
      topActions: [],
      watchList: '',
      sectorObservations: '',
      riskWarnings: '',
    };
  }

  // Save to database
  const contentToSave = {
    healthSummary: parsed.healthSummary,
    watchList: parsed.watchList,
    sectorObservations: parsed.sectorObservations,
    riskWarnings: parsed.riskWarnings,
  };

  await saveBriefing(
    JSON.stringify(contentToSave),
    parsed.topActions || [],
    { totalValue, holdingCount: holdings.length }
  );

  return {
    ...contentToSave,
    topActions: parsed.topActions || [],
    generatedAt: new Date().toISOString(),
    cached: false,
  };
}
