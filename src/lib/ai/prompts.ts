import type { EnrichedHolding, ActionItem } from '../types';

export function buildBriefingPrompt(
  holdings: EnrichedHolding[],
  totalValue: number,
  sectorBreakdown: { sector: string; weight: number }[]
): string {
  const holdingSummaries = holdings.map(h => ({
    symbol: h.symbol,
    weight: totalValue > 0 ? ((h.marketValue / totalValue) * 100).toFixed(1) + '%' : '0%',
    gainLoss: (h.gainLossPercent?.toFixed(1) || '0') + '%',
    momentumScore: h.score ?? 'N/A',
    trend: h.trend ?? 'unknown',
    signal: h.signal ?? 'N/A',
    riskLevel: h.riskLevel ?? 'unknown',
    trailingStopDistance: h.trailingStopPercent ? h.trailingStopPercent.toFixed(1) + '% from stop' : 'N/A',
    rsi: h.rsi14?.toFixed(0) ?? 'N/A',
    priceVsSma50: h.priceVsSma50 ? (h.priceVsSma50 >= 0 ? '+' : '') + h.priceVsSma50.toFixed(1) + '%' : 'N/A',
    priceVsSma200: h.priceVsSma200 ? (h.priceVsSma200 >= 0 ? '+' : '') + h.priceVsSma200.toFixed(1) + '%' : 'N/A',
    goldenCross: h.goldenCross ?? false,
    deathCross: h.deathCross ?? false,
    sector: h.sector || 'Unknown',
  }));

  const keySignals: string[] = [];
  for (const h of holdings) {
    if (h.goldenCross) keySignals.push(`${h.symbol}: Golden Cross detected`);
    if (h.deathCross) keySignals.push(`${h.symbol}: Death Cross detected`);
    if (h.rsi14 && h.rsi14 > 70) keySignals.push(`${h.symbol}: RSI overbought (${h.rsi14.toFixed(0)})`);
    if (h.rsi14 && h.rsi14 < 30) keySignals.push(`${h.symbol}: RSI oversold (${h.rsi14.toFixed(0)})`);
    if (h.trailingStopPercent && h.trailingStopPercent < 3) keySignals.push(`${h.symbol}: Very close to trailing stop (${h.trailingStopPercent.toFixed(1)}%)`);
    if (h.portfolioWeight && h.portfolioWeight > 20) keySignals.push(`${h.symbol}: High concentration (${h.portfolioWeight.toFixed(1)}% of portfolio)`);
  }

  return `You are a portfolio analyst providing a weekly briefing for a long-term investor. Be direct, concise, and actionable. Focus on what matters this week.

Here is the current state of the portfolio:
- Total value: $${totalValue.toLocaleString('en-US', { minimumFractionDigits: 2 })}
- Number of holdings: ${holdings.length}

Holdings:
${JSON.stringify(holdingSummaries, null, 2)}

Sector exposure:
${sectorBreakdown.map(s => `- ${s.sector}: ${s.weight.toFixed(1)}%`).join('\n')}

Key signals this week:
${keySignals.length > 0 ? keySignals.map(s => `- ${s}`).join('\n') : '- No notable signals'}

Provide your briefing in this exact JSON format:
{
  "healthSummary": "2-3 sentence portfolio health summary",
  "topActions": [
    {
      "symbol": "TICKER",
      "action": "hold_strong|tighten_stop|consider_trimming|add_on_dip|watch_closely",
      "reason": "Brief reason for the action",
      "urgency": "low|medium|high"
    }
  ],
  "watchList": "Which holdings to watch closely and why (2-3 sentences)",
  "sectorObservations": "Any sector rotation observations (1-2 sentences)",
  "riskWarnings": "Any risk warnings if positions need attention (1-2 sentences, or 'None' if portfolio is healthy)"
}

Respond ONLY with the JSON object, no other text.`;
}

export function buildNoiseFilterPrompt(
  headlines: { headline: string; source: string; symbols: string[] }[],
  holdingSymbols: string[]
): string {
  return `You are a financial news analyst. Score these headlines for relevance to a portfolio holder who owns: ${holdingSymbols.join(', ')}.

Headlines:
${headlines.map((h, i) => `${i + 1}. [${h.source}] ${h.headline} (related: ${h.symbols.join(', ')})`).join('\n')}

For each headline, provide a relevance score (0-100) and a brief reason. Only include headlines scoring 40+.

Respond in this JSON format:
{
  "relevant": [
    { "index": 1, "score": 85, "reason": "Direct impact on held position" }
  ]
}

Respond ONLY with the JSON object.`;
}

export function buildAskPrompt(
  question: string,
  holdings: EnrichedHolding[],
  totalValue: number,
  sectorBreakdown: { sector: string; weight: number }[]
): string {
  const portfolioContext = holdings.map(h => ({
    symbol: h.symbol,
    shares: h.quantity,
    currentPrice: h.currentPrice,
    marketValue: h.marketValue,
    weight: totalValue > 0 ? ((h.marketValue / totalValue) * 100).toFixed(1) + '%' : '0%',
    gainLoss: h.gainLossPercent?.toFixed(1) + '%',
    costBasis: h.costBasis,
    sector: h.sector,
    momentumScore: h.score ?? 'N/A',
    signal: h.signal ?? 'N/A',
    riskLevel: h.riskLevel ?? 'unknown',
    rsi: h.rsi14?.toFixed(0) ?? 'N/A',
    trailingStop: h.trailingStopPrice?.toFixed(2) ?? 'N/A',
  }));

  return `You are an AI portfolio advisor. You have access to the user's complete portfolio data. Answer their question using the actual data provided. Be specific, reference actual numbers, and give actionable advice suited for a long-term investor.

IMPORTANT: You are NOT a licensed financial advisor. Frame advice as analysis and observations, not as financial recommendations.

Portfolio Overview:
- Total Value: $${totalValue.toLocaleString('en-US', { minimumFractionDigits: 2 })}
- Holdings: ${holdings.length}
- Sectors: ${sectorBreakdown.map(s => `${s.sector} (${s.weight.toFixed(1)}%)`).join(', ')}

Holdings Detail:
${JSON.stringify(portfolioContext, null, 2)}

User's question: ${question}`;
}
