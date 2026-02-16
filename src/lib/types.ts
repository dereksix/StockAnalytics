export interface Holding {
  symbol: string;
  description: string;
  quantity: number;
  costBasis: number;
  totalCostBasis: number;
  currentPrice: number;
  marketValue: number;
  gainLoss: number;
  gainLossPercent: number;
  sector: string;
  industry: string;
  accountType: string;
}

export interface TechnicalSignals {
  symbol: string;
  rsi14: number;
  sma50: number;
  sma200: number;
  macd: { macd: number; signal: number; histogram: number };
  atr14: number;
  priceVsSma50: number;
  priceVsSma200: number;
  goldenCross: boolean;
  deathCross: boolean;
  relativeStrengthVsSpy: number;
}

export interface RiskMetrics {
  symbol: string;
  trailingStopPrice: number;
  trailingStopPercent: number;
  portfolioWeight: number;
  sectorWeight: number;
  riskLevel: 'low' | 'medium' | 'high';
  daysUntilLongTerm: number | null;
  nextEarningsDate: string | null;
}

export interface MomentumScore {
  symbol: string;
  score: number;
  trend: 'accelerating' | 'steady' | 'decelerating' | 'rolling_over';
  signal: 'strong_buy' | 'buy' | 'hold' | 'caution' | 'sell';
}

export interface PortfolioAnalysis {
  generatedAt: string;
  holdings: EnrichedHolding[];
  overallHealth: 'strong' | 'healthy' | 'caution' | 'warning';
  topActions: ActionItem[];
  sectorBreakdown: { sector: string; weight: number; trend: string }[];
}

export interface ActionItem {
  symbol: string;
  action: 'hold_strong' | 'tighten_stop' | 'consider_trimming' | 'add_on_dip' | 'watch_closely';
  reason: string;
  urgency: 'low' | 'medium' | 'high';
}

export type EnrichedHolding = Holding & Partial<TechnicalSignals> & Partial<RiskMetrics> & Partial<MomentumScore>;

export interface HistoricalDataPoint {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface MarketQuote {
  symbol: string;
  regularMarketPrice: number;
  regularMarketChange: number;
  regularMarketChangePercent: number;
  regularMarketDayHigh: number;
  regularMarketDayLow: number;
  regularMarketVolume: number;
  fiftyTwoWeekHigh: number;
  fiftyTwoWeekLow: number;
  marketCap: number;
  trailingPE: number;
  forwardPE: number;
  dividendYield: number;
  sector: string;
  industry: string;
}

export interface NewsItem {
  id: string;
  headline: string;
  summary: string;
  source: string;
  url: string;
  datetime: string;
  relatedSymbols: string[];
  relevanceScore?: number;
}

export interface Briefing {
  id: number;
  generatedAt: string;
  content: string;
  actionItems: ActionItem[];
  portfolioSnapshot: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}
