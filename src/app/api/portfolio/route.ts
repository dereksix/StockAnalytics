import { NextResponse } from 'next/server';
import { getAllHoldings, getAnalysisCache } from '@/lib/db';
import type { EnrichedHolding } from '@/lib/types';

interface HoldingRow {
  symbol: string;
  description: string;
  quantity: number;
  cost_basis: number;
  total_cost_basis: number;
  current_price: number;
  market_value: number;
  gain_loss: number;
  gain_loss_percent: number;
  sector: string;
  industry: string;
  account_type: string;
  last_updated: string;
  // Extended Snowball fields
  country: string;
  currency: string;
  pe_ratio: number;
  eps: number;
  beta: number;
  expense_ratio: number;
  dividend_yield: number;
  dividend_yield_on_cost: number;
  dividends_per_share: number;
  dividends_received: number;
  dividend_growth_5y: number;
  next_payment_date: string;
  next_payment_amount: number;
  ex_dividend_date: string;
  daily_change_dollar: number;
  daily_change_percent: number;
  irr: number;
  realized_pnl: number;
  total_profit: number;
  total_profit_percent: number;
  tax: number;
  portfolio_share_percent: number;
  target_share_percent: number;
  category: string;
  isin: string;
  asset_type: string;
}

export async function GET() {
  try {
    const rows = (await getAllHoldings()) as unknown as HoldingRow[];

    const holdings: EnrichedHolding[] = [];
    for (const row of rows) {
      const holding: EnrichedHolding = {
        symbol: row.symbol,
        description: row.description,
        quantity: row.quantity,
        costBasis: row.cost_basis,
        totalCostBasis: row.total_cost_basis,
        currentPrice: row.current_price,
        marketValue: row.market_value,
        gainLoss: row.gain_loss,
        gainLossPercent: row.gain_loss_percent,
        sector: row.sector,
        industry: row.industry,
        accountType: row.account_type,
        // Extended fields
        country: row.country || '',
        currency: row.currency || '',
        peRatio: row.pe_ratio || 0,
        eps: row.eps || 0,
        beta: row.beta || 0,
        expenseRatio: row.expense_ratio || 0,
        dividendYield: row.dividend_yield || 0,
        dividendYieldOnCost: row.dividend_yield_on_cost || 0,
        dividendsPerShare: row.dividends_per_share || 0,
        dividendsReceived: row.dividends_received || 0,
        dividendGrowth5y: row.dividend_growth_5y || 0,
        nextPaymentDate: row.next_payment_date || '',
        nextPaymentAmount: row.next_payment_amount || 0,
        exDividendDate: row.ex_dividend_date || '',
        dailyChangeDollar: row.daily_change_dollar || 0,
        dailyChangePercent: row.daily_change_percent || 0,
        irr: row.irr || 0,
        realizedPnl: row.realized_pnl || 0,
        totalProfit: row.total_profit || 0,
        totalProfitPercent: row.total_profit_percent || 0,
        tax: row.tax || 0,
        portfolioSharePercent: row.portfolio_share_percent || 0,
        targetSharePercent: row.target_share_percent || 0,
        category: row.category || '',
        isin: row.isin || '',
        assetType: row.asset_type || '',
      };

      // Merge cached analysis if available
      const cache = await getAnalysisCache(row.symbol);
      if (cache) {
        Object.assign(holding, cache.technicals, cache.risk, cache.momentum);
      }

      holdings.push(holding);
    }

    // Aggregate portfolio stats
    const totalValue = holdings.reduce((sum, h) => sum + h.marketValue, 0);
    const totalCost = holdings.reduce((sum, h) => sum + h.totalCostBasis, 0);
    const totalGainLoss = totalValue - totalCost;
    const totalGainLossPercent = totalCost > 0 ? (totalGainLoss / totalCost) * 100 : 0;

    // Daily change totals
    const dailyChangeDollar = holdings.reduce((sum, h) => sum + (h.dailyChangeDollar || 0), 0);
    const dailyChangePercent = totalValue > 0
      ? holdings.reduce((sum, h) => sum + ((h.dailyChangePercent || 0) * h.marketValue), 0) / totalValue
      : 0;

    // Sector breakdown
    const sectorMap = new Map<string, number>();
    for (const h of holdings) {
      const sector = h.sector || 'Unknown';
      sectorMap.set(sector, (sectorMap.get(sector) || 0) + h.marketValue);
    }
    const sectorBreakdown = Array.from(sectorMap.entries())
      .map(([sector, value]) => ({
        sector,
        value,
        weight: totalValue > 0 ? (value / totalValue) * 100 : 0,
      }))
      .sort((a, b) => b.value - a.value);

    // Country breakdown
    const countryMap = new Map<string, number>();
    for (const h of holdings) {
      const country = h.country || 'Unknown';
      countryMap.set(country, (countryMap.get(country) || 0) + h.marketValue);
    }
    const countryBreakdown = Array.from(countryMap.entries())
      .map(([country, value]) => ({
        country,
        value,
        weight: totalValue > 0 ? (value / totalValue) * 100 : 0,
      }))
      .sort((a, b) => b.value - a.value);

    // Asset type breakdown
    const typeMap = new Map<string, number>();
    for (const h of holdings) {
      const type = h.assetType || 'Stock';
      typeMap.set(type, (typeMap.get(type) || 0) + h.marketValue);
    }
    const assetTypeBreakdown = Array.from(typeMap.entries())
      .map(([type, value]) => ({
        type,
        value,
        weight: totalValue > 0 ? (value / totalValue) * 100 : 0,
      }))
      .sort((a, b) => b.value - a.value);

    // Dividend summary
    const totalAnnualIncome = holdings.reduce((sum, h) => sum + ((h.dividendsPerShare || 0) * h.quantity), 0);
    const averageYield = totalValue > 0
      ? holdings.reduce((sum, h) => sum + ((h.dividendYield || 0) * h.marketValue), 0) / totalValue
      : 0;

    return NextResponse.json({
      holdings,
      summary: {
        totalValue,
        totalCost,
        totalGainLoss,
        totalGainLossPercent,
        holdingCount: holdings.length,
        dailyChangeDollar,
        dailyChangePercent,
      },
      sectorBreakdown,
      countryBreakdown,
      assetTypeBreakdown,
      dividendSummary: {
        totalAnnualIncome,
        averageYield,
        averageYieldOnCost: totalCost > 0
          ? holdings.reduce((sum, h) => sum + ((h.dividendYieldOnCost || 0) * h.totalCostBasis), 0) / totalCost
          : 0,
      },
    });
  } catch (error) {
    console.error('Portfolio error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch portfolio' },
      { status: 500 }
    );
  }
}
