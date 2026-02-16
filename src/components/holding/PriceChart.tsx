'use client';

import {
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Legend,
} from 'recharts';
import { format, parseISO } from 'date-fns';

interface PriceChartProps {
  data: { date: string; close: number; high: number; low: number; open: number; volume: number }[];
  sma50?: number;
  sma200?: number;
  trailingStopPrice?: number;
}

export default function PriceChart({ data, sma50, sma200, trailingStopPrice }: PriceChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex h-[400px] items-center justify-center card text-text-muted">
        No price data available
      </div>
    );
  }

  const chartData = data.map((d, i) => {
    const sma50Calc = i >= 49
      ? data.slice(i - 49, i + 1).reduce((sum, p) => sum + p.close, 0) / 50
      : undefined;
    const sma200Calc = i >= 199
      ? data.slice(i - 199, i + 1).reduce((sum, p) => sum + p.close, 0) / 200
      : undefined;

    return {
      ...d,
      dateLabel: format(parseISO(d.date), 'MMM dd'),
      sma50Line: sma50Calc,
      sma200Line: sma200Calc,
    };
  });

  const prices = data.map(d => d.close);
  const minPrice = Math.min(...prices) * 0.95;
  const maxPrice = Math.max(...prices) * 1.05;

  return (
    <div className="card p-4">
      <h3 className="mb-4 text-sm font-semibold text-text-secondary">Price History</h3>
      <div className="h-[400px]">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 10 }}>
            <defs>
              <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#6382ff" stopOpacity={0.3} />
                <stop offset="100%" stopColor="#6382ff" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgb(45, 45, 58)" />
            <XAxis
              dataKey="dateLabel"
              tick={{ fontSize: 11, fill: 'rgb(130, 130, 150)' }}
              interval={Math.floor(chartData.length / 8)}
              axisLine={{ stroke: 'rgb(45, 45, 58)' }}
              tickLine={{ stroke: 'rgb(45, 45, 58)' }}
            />
            <YAxis
              domain={[minPrice, maxPrice]}
              tick={{ fontSize: 11, fill: 'rgb(130, 130, 150)' }}
              tickFormatter={(val: number) => `$${val.toFixed(0)}`}
              axisLine={{ stroke: 'rgb(45, 45, 58)' }}
              tickLine={{ stroke: 'rgb(45, 45, 58)' }}
            />
            <Tooltip
              formatter={(value: number, name: string) => {
                const labels: Record<string, string> = {
                  close: 'Price',
                  sma50Line: '50 SMA',
                  sma200Line: '200 SMA',
                };
                return [`$${value.toFixed(2)}`, labels[name] || name];
              }}
              labelFormatter={(label: string) => label}
              contentStyle={{
                backgroundColor: 'rgb(26, 26, 36)',
                border: '1px solid rgb(60, 60, 78)',
                borderRadius: '8px',
                color: 'rgb(240, 240, 245)',
              }}
              itemStyle={{ color: 'rgb(180, 180, 195)' }}
              labelStyle={{ color: 'rgb(240, 240, 245)', fontWeight: 600 }}
            />
            <Legend
              wrapperStyle={{ color: 'rgb(180, 180, 195)' }}
            />

            {/* Gradient area fill under price */}
            <Area
              type="monotone"
              dataKey="close"
              fill="url(#priceGradient)"
              stroke="none"
              name="Price Area"
              legendType="none"
            />

            {/* Price line */}
            <Line
              type="monotone"
              dataKey="close"
              stroke="#6382ff"
              strokeWidth={2}
              dot={false}
              name="Price"
            />

            {/* 50 SMA */}
            <Line
              type="monotone"
              dataKey="sma50Line"
              stroke="#fbbf24"
              strokeWidth={1.5}
              dot={false}
              strokeDasharray="4 2"
              name="50 SMA"
              connectNulls={false}
            />

            {/* 200 SMA */}
            <Line
              type="monotone"
              dataKey="sma200Line"
              stroke="#a855f7"
              strokeWidth={1.5}
              dot={false}
              strokeDasharray="6 3"
              name="200 SMA"
              connectNulls={false}
            />

            {/* Trailing stop line */}
            {trailingStopPrice && trailingStopPrice > minPrice && (
              <ReferenceLine
                y={trailingStopPrice}
                stroke="#f87171"
                strokeDasharray="8 4"
                strokeWidth={2}
                label={{
                  value: `Stop: $${trailingStopPrice.toFixed(2)}`,
                  position: 'right',
                  fill: '#f87171',
                  fontSize: 11,
                }}
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
