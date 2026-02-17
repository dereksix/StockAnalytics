'use client';

import DonutChart from '@/components/charts/DonutChart';
import type { EnrichedHolding } from '@/lib/types';

interface Props {
  portfolio: {
    holdings: EnrichedHolding[];
    summary: { totalValue: number };
    sectorBreakdown: { sector: string; value: number; weight: number }[];
    countryBreakdown?: { country: string; value: number; weight: number }[];
  };
}

export default function DiversificationTab({ portfolio }: Props) {
  const { holdings, summary, sectorBreakdown } = portfolio;
  const totalValue = summary.totalValue;

  // Holdings breakdown
  const holdingsData = holdings.map(h => ({
    name: h.symbol,
    value: h.marketValue,
    weight: totalValue > 0 ? (h.marketValue / totalValue) * 100 : 0,
  }));

  // Sector breakdown
  const sectorData = sectorBreakdown.map(s => ({
    name: s.sector || 'Unknown',
    value: s.value,
    weight: s.weight,
  }));

  // Country breakdown from holdings
  const countryMap = new Map<string, number>();
  for (const h of holdings) {
    const country = h.country || 'Unknown';
    countryMap.set(country, (countryMap.get(country) || 0) + h.marketValue);
  }
  const countryData = Array.from(countryMap.entries())
    .map(([name, value]) => ({
      name,
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
  const typeData = Array.from(typeMap.entries())
    .map(([name, value]) => ({
      name,
      value,
      weight: totalValue > 0 ? (value / totalValue) * 100 : 0,
    }))
    .sort((a, b) => b.value - a.value);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <DonutChart
          data={holdingsData}
          title="All Holdings"
          centerLabel="Holdings"
          centerValue={holdings.length.toString()}
          topN={12}
        />
        <DonutChart
          data={sectorData}
          title="Sector Breakdown"
          centerLabel="Sectors"
          centerValue={sectorData.length.toString()}
          topN={10}
        />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <DonutChart
          data={countryData}
          title="Country Breakdown"
          centerLabel="Countries"
          centerValue={countryData.length.toString()}
          topN={10}
        />
        <DonutChart
          data={typeData}
          title="Asset Type Breakdown"
          centerLabel="Types"
          centerValue={typeData.length.toString()}
          topN={5}
        />
      </div>
    </div>
  );
}
