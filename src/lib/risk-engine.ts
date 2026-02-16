import type { RiskMetrics, HistoricalDataPoint, EnrichedHolding, TechnicalSignals } from './types';

interface RiskInput {
  symbol: string;
  currentPrice: number;
  marketValue: number;
  totalPortfolioValue: number;
  sectorValue: number;
  totalSectorValue: number;
  atr14: number;
  historicalData: HistoricalDataPoint[];
  purchaseDate?: string;
  nextEarningsDate?: string | null;
}

export function computeRiskMetrics(input: RiskInput): RiskMetrics {
  const {
    symbol,
    currentPrice,
    marketValue,
    totalPortfolioValue,
    sectorValue,
    totalSectorValue,
    atr14,
    historicalData,
    purchaseDate,
    nextEarningsDate,
  } = input;

  // Trailing stop: High - (2 × ATR14)
  const sorted = [...historicalData].sort((a, b) => a.date.localeCompare(b.date));
  const recentHighs = sorted.slice(-20).map(d => d.high);
  const recentHigh = Math.max(...recentHighs, currentPrice);

  const trailingStopPrice = atr14 > 0
    ? Math.max(0, recentHigh - 2 * atr14)
    : currentPrice * 0.9; // Fallback: 10% below current price

  const trailingStopPercent = currentPrice > 0
    ? ((currentPrice - trailingStopPrice) / currentPrice) * 100
    : 10;

  // Portfolio weight
  const portfolioWeight = totalPortfolioValue > 0
    ? (marketValue / totalPortfolioValue) * 100
    : 0;

  // Sector weight
  const sectorWeight = totalSectorValue > 0
    ? (sectorValue / totalSectorValue) * 100
    : 0;

  // Risk level assessment
  let riskLevel: 'low' | 'medium' | 'high' = 'low';
  const riskFactors: number[] = [];

  // High concentration risk
  if (portfolioWeight > 20) riskFactors.push(3);
  else if (portfolioWeight > 10) riskFactors.push(1);

  // Stop is close
  if (trailingStopPercent < 3) riskFactors.push(2);
  else if (trailingStopPercent < 5) riskFactors.push(1);

  // High volatility
  if (atr14 > currentPrice * 0.03) riskFactors.push(2);
  else if (atr14 > currentPrice * 0.02) riskFactors.push(1);

  const totalRisk = riskFactors.reduce((a, b) => a + b, 0);
  if (totalRisk >= 4) riskLevel = 'high';
  else if (totalRisk >= 2) riskLevel = 'medium';

  // Days until long-term capital gains (1 year)
  let daysUntilLongTerm: number | null = null;
  if (purchaseDate) {
    const purchase = new Date(purchaseDate);
    const longTermDate = new Date(purchase);
    longTermDate.setFullYear(longTermDate.getFullYear() + 1);
    const now = new Date();
    const diff = Math.ceil((longTermDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    daysUntilLongTerm = diff > 0 ? diff : null;
  }

  return {
    symbol,
    trailingStopPrice,
    trailingStopPercent,
    portfolioWeight,
    sectorWeight,
    riskLevel,
    daysUntilLongTerm,
    nextEarningsDate: nextEarningsDate || null,
  };
}

export function computeAllRiskMetrics(
  holdings: EnrichedHolding[],
  technicals: Map<string, TechnicalSignals>,
  historicalDataMap: Map<string, HistoricalDataPoint[]>
): Map<string, RiskMetrics> {
  const totalPortfolioValue = holdings.reduce((sum, h) => sum + h.marketValue, 0);

  // Compute sector totals
  const sectorTotals = new Map<string, number>();
  for (const h of holdings) {
    const sector = h.sector || 'Unknown';
    sectorTotals.set(sector, (sectorTotals.get(sector) || 0) + h.marketValue);
  }

  const results = new Map<string, RiskMetrics>();
  for (const h of holdings) {
    const tech = technicals.get(h.symbol);
    const historicalData = historicalDataMap.get(h.symbol) || [];
    const sector = h.sector || 'Unknown';

    results.set(h.symbol, computeRiskMetrics({
      symbol: h.symbol,
      currentPrice: h.currentPrice,
      marketValue: h.marketValue,
      totalPortfolioValue,
      sectorValue: h.marketValue,
      totalSectorValue: sectorTotals.get(sector) || h.marketValue,
      atr14: tech?.atr14 || 0,
      historicalData,
    }));
  }

  return results;
}
