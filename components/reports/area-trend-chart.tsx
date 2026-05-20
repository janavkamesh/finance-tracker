"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

export interface MonthPoint {
  month: string;
  income: number;
  expense: number;
}

export type ChartType = "income" | "expense";

interface Props {
  data: MonthPoint[];
  type: ChartType;
}

function formatK(value: number) {
  if (value >= 100_000) return `₹${(value / 100_000).toFixed(1)}L`;
  if (value >= 1_000) return `₹${(value / 1_000).toFixed(0)}K`;
  return `₹${value}`;
}

const CONFIG: Record<ChartType, { color: string; gradientId: string; label: string }> = {
  income:  { color: "#16A34A", gradientId: "incomeGrad",  label: "Income" },
  expense: { color: "#DC2626", gradientId: "expenseGrad", label: "Expenses" },
};

export function AreaTrendChart({ data, type }: Props) {
  const { color, gradientId, label } = CONFIG[type];
  const dataKey = type === "income" ? "income" : "expense";
  const hasData = data.some((d) => d[dataKey] > 0);

  if (!hasData) {
    return (
      <div className="flex h-[220px] flex-col items-center justify-center gap-2 text-center">
        <svg className="w-7 h-7 text-gray-200" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" />
        </svg>
        <p className="text-sm text-gray-400">No {label.toLowerCase()} data</p>
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={color} stopOpacity={0.15} />
            <stop offset="95%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
        <XAxis
          dataKey="month"
          tick={{ fontSize: 11, fill: "#9ca3af" }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tickFormatter={formatK}
          tick={{ fontSize: 11, fill: "#9ca3af" }}
          axisLine={false}
          tickLine={false}
          width={46}
        />
        <Tooltip
          formatter={(value) =>
            value != null
              ? [new Intl.NumberFormat("en-IN", {
                  style: "currency",
                  currency: "INR",
                  maximumFractionDigits: 0,
                }).format(Number(value)), label]
              : ""
          }
          contentStyle={{
            borderRadius: 8,
            border: "1px solid var(--chart-grid)",
            background: "var(--bg-elevated)",
            color: "var(--text-primary)",
            fontSize: 13,
          }}
        />
        <Area
          type="monotone"
          dataKey={dataKey}
          stroke={color}
          strokeWidth={2}
          fill={`url(#${gradientId})`}
          dot={false}
          activeDot={{ r: 4, fill: color }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
