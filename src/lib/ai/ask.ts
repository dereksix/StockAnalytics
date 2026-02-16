import { getAnthropicClient, getModelId } from './client';
import { buildAskPrompt } from './prompts';
import { saveChatMessage } from '../db';
import type { EnrichedHolding } from '../types';

export async function askAboutPortfolio(
  question: string,
  holdings: EnrichedHolding[],
  totalValue: number,
  sectorBreakdown: { sector: string; weight: number }[]
): Promise<string> {
  const client = getAnthropicClient();
  const prompt = buildAskPrompt(question, holdings, totalValue, sectorBreakdown);

  await saveChatMessage('user', question);

  const response = await client.messages.create({
    model: getModelId('fast'),
    max_tokens: 2048,
    messages: [{ role: 'user', content: prompt }],
  });

  const answer = response.content[0].type === 'text' ? response.content[0].text : '';

  await saveChatMessage('assistant', answer);

  return answer;
}

export async function* streamAskAboutPortfolio(
  question: string,
  holdings: EnrichedHolding[],
  totalValue: number,
  sectorBreakdown: { sector: string; weight: number }[]
): AsyncGenerator<string> {
  const client = getAnthropicClient();
  const prompt = buildAskPrompt(question, holdings, totalValue, sectorBreakdown);

  await saveChatMessage('user', question);

  const stream = client.messages.stream({
    model: getModelId('fast'),
    max_tokens: 2048,
    messages: [{ role: 'user', content: prompt }],
  });

  let fullResponse = '';

  for await (const event of stream) {
    if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
      fullResponse += event.delta.text;
      yield event.delta.text;
    }
  }

  await saveChatMessage('assistant', fullResponse);
}
