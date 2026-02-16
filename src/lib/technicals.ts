import { RSI, SMA, EMA, MACD, ATR, BollingerBands } from 'technicalindicators';
import type { TechnicalSignals, HistoricalDataPoint } from './types';

export function computeTechnicals(
  symbol: string,
  data: HistoricalDataPoint[],
  spyData?: HistoricalDataPoint[]
): TechnicalSignals {
  // Data should be oldest-first for indicator calculations
  const sorted = [...data].sort((a, b) => a.date.localeCompare(b.date));
  const closes = sorted.map(d => d.close);
  const highs = sorted.map(d => d.high);
  const lows = sorted.map(d => d.low);
  const currentPrice = closes[closes.length - 1] || 0;

  // RSI (14-period)
  const rsiValues = RSI.calculate({ values: closes, period: 14 });
  const rsi14 = rsiValues[rsiValues.length - 1] || 50;

  // SMA 50 and 200
  const sma50Values = SMA.calculate({ values: closes, period: 50 });
  const sma200Values = SMA.calculate({ values: closes, period: 200 });
  const sma50 = sma50Values[sma50Values.length - 1] || currentPrice;
  const sma200 = sma200Values[sma200Values.length - 1] || currentPrice;

  // Previous SMAs for cross detection
  const prevSma50 = sma50Values[sma50Values.length - 2] || sma50;
  const prevSma200 = sma200Values.length >= 2
    ? sma200Values[sma200Values.length - 2]
    : sma200;

  // Golden Cross: 50 SMA crosses above 200 SMA
  const goldenCross = prevSma50 <= prevSma200 && sma50 > sma200;
  // Death Cross: 50 SMA crosses below 200 SMA
  const deathCross = prevSma50 >= prevSma200 && sma50 < sma200;

  // MACD (12, 26, 9)
  const macdValues = MACD.calculate({
    values: closes,
    fastPeriod: 12,
    slowPeriod: 26,
    signalPeriod: 9,
    SimpleMAOscillator: false,
    SimpleMASignal: false,
  });
  const latestMACD = macdValues[macdValues.length - 1];
  const macd = {
    macd: latestMACD?.MACD || 0,
    signal: latestMACD?.signal || 0,
    histogram: latestMACD?.histogram || 0,
  };

  // ATR (14-period)
  const atrValues = ATR.calculate({
    high: highs,
    low: lows,
    close: closes,
    period: 14,
  });
  const atr14 = atrValues[atrValues.length - 1] || 0;

  // Price vs SMA (percent difference)
  const priceVsSma50 = sma50 > 0 ? ((currentPrice - sma50) / sma50) * 100 : 0;
  const priceVsSma200 = sma200 > 0 ? ((currentPrice - sma200) / sma200) * 100 : 0;

  // Relative Strength vs SPY
  let relativeStrengthVsSpy = 0;
  if (spyData && spyData.length > 0) {
    const spySorted = [...spyData].sort((a, b) => a.date.localeCompare(b.date));
    const spyCloses = spySorted.map(d => d.close);
    if (spyCloses.length >= 2 && closes.length >= 2) {
      const stockReturn = (closes[closes.length - 1] / closes[0] - 1) * 100;
      const spyReturn = (spyCloses[spyCloses.length - 1] / spyCloses[0] - 1) * 100;
      relativeStrengthVsSpy = stockReturn - spyReturn;
    }
  }

  return {
    symbol,
    rsi14,
    sma50,
    sma200,
    macd,
    atr14,
    priceVsSma50,
    priceVsSma200,
    goldenCross,
    deathCross,
    relativeStrengthVsSpy,
  };
}

export function computeBollingerBands(closes: number[], period = 20, stdDev = 2) {
  const bb = BollingerBands.calculate({
    period,
    values: closes,
    stdDev,
  });
  return bb;
}
