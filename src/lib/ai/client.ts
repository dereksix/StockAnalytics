import Anthropic from '@anthropic-ai/sdk';

let client: Anthropic | null = null;

export function getAnthropicClient(): Anthropic {
  if (!client) {
    client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
  }
  return client;
}

export type ModelTier = 'fast' | 'deep';

export function getModelId(tier: ModelTier): string {
  switch (tier) {
    case 'fast':
      return 'claude-haiku-4-5-20251001';
    case 'deep':
      return 'claude-sonnet-4-5-20250929';
    default:
      return 'claude-haiku-4-5-20251001';
  }
}
