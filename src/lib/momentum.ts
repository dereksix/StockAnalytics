import type { MomentumScore, TechnicalSignals } from './types';

/**
 * Momentum scoring algorithm (-100 to +100)
 *
 * Weights:
 * - RSI position & direction: 25%
 * - Price vs 50-day SMA: 20%
 * - Price vs 200-day SMA: 15%
 * - MACD histogram direction: 20%
 * - Relative strength vs SPY: 20%
 */
export function computeMomentum(technicals: TechnicalSignals): MomentumScore {
  const { symbol, rsi14, priceVsSma50, priceVsSma200, macd, relativeStrengthVsSpy } = technicals;

  // RSI component (25% weight): -25 to +25
  // RSI 30 = oversold (slightly positive for contrarian), RSI 70 = overbought
  // Best momentum zone: RSI 50-65
  let rsiScore: number;
  if (rsi14 >= 50 && rsi14 <= 65) {
    rsiScore = 25; // Sweet spot for momentum
  } else if (rsi14 > 65 && rsi14 <= 70) {
    rsiScore = 15; // Strong but getting extended
  } else if (rsi14 > 70) {
    rsiScore = Math.max(-25, 25 - (rsi14 - 70) * 2.5); // Overbought penalty
  } else if (rsi14 >= 40 && rsi14 < 50) {
    rsiScore = 5; // Neutral to slightly weak
  } else if (rsi14 >= 30 && rsi14 < 40) {
    rsiScore = -10; // Weak momentum
  } else {
    rsiScore = Math.max(-25, -15 - (30 - rsi14) * 1); // Oversold
  }

  // Price vs 50 SMA (20% weight): -20 to +20
  let sma50Score: number;
  if (priceVsSma50 > 0) {
    sma50Score = Math.min(20, priceVsSma50 * 2);
  } else {
    sma50Score = Math.max(-20, priceVsSma50 * 2);
  }

  // Price vs 200 SMA (15% weight): -15 to +15
  let sma200Score: number;
  if (priceVsSma200 > 0) {
    sma200Score = Math.min(15, priceVsSma200 * 1);
  } else {
    sma200Score = Math.max(-15, priceVsSma200 * 1);
  }

  // MACD histogram (20% weight): -20 to +20
  let macdScore: number;
  const hist = macd.histogram;
  if (hist > 0) {
    macdScore = Math.min(20, hist * 10);
  } else {
    macdScore = Math.max(-20, hist * 10);
  }

  // Relative strength vs SPY (20% weight): -20 to +20
  let rsScore: number;
  if (relativeStrengthVsSpy > 0) {
    rsScore = Math.min(20, relativeStrengthVsSpy * 1);
  } else {
    rsScore = Math.max(-20, relativeStrengthVsSpy * 1);
  }

  // Total score
  const score = Math.round(
    Math.max(-100, Math.min(100, rsiScore + sma50Score + sma200Score + macdScore + rsScore))
  );

  // Determine trend
  const trend = determineTrend(score, macd.histogram, priceVsSma50);

  // Determine signal
  const signal = determineSignal(score);

  return { symbol, score, trend, signal };
}

function determineTrend(
  score: number,
  macdHistogram: number,
  priceVsSma50: number
): MomentumScore['trend'] {
  if (score > 40 && macdHistogram > 0 && priceVsSma50 > 0) {
    return 'accelerating';
  }
  if (score > 0 && score <= 40) {
    return 'steady';
  }
  if (score > -20 && score <= 0) {
    return 'decelerating';
  }
  return 'rolling_over';
}

function determineSignal(score: number): MomentumScore['signal'] {
  if (score >= 50) return 'strong_buy';
  if (score >= 20) return 'buy';
  if (score >= -10) return 'hold';
  if (score >= -40) return 'caution';
  return 'sell';
}
