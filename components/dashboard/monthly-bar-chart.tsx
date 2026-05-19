"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

export interface MonthlyData {
  month: string;
  income: number;
  expense: number;
}

function formatK(value: number) {
  if (value >= 100_000) return `₹${(value / 100_000).toFixed(1)}L`;
  if (value >= 1_000) return `₹${(value / 1_000).toFixed(0)}K`;
  return `₹${value}`;
}

export function MonthlyBarChart({
  data,
  showMonthHint = true,
}: {
  data: MonthlyData[];
  showMonthHint?: boolean;
}) {
  const activeMonths = data.filter((d) => d.income > 0 || d.expense > 0).length;

  if (data.every((d) => d.income === 0 && d.expense === 0)) {
    return (
      <div className="flex h-[240px] flex-col items-center justify-center gap-2 text-center">
        <svg className="w-8 h-8 text-gray-200" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
        </svg>
        <p className="text-sm font-medium text-gray-400">Your spending trends will appear here</p>
        <p className="text-xs text-gray-300">Add a few transactions to see your monthly overview</p>
      </div>
    );
  }

  return (
    <>
      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={data} barCategoryGap="30%" barGap={4}>
          <CartesianGrid vertical={false} stroke="#f0f0f0" />
          <XAxis
            dataKey="month"
            tick={{ fontSize: 12, fill: "#9ca3af" }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tickFormatter={formatK}
            tick={{ fontSize: 11, fill: "#9ca3af" }}
            axisLine={false}
            tickLine={false}
            width={48}
          />
          <Tooltip
            cursor={false}
            formatter={(value) =>
              value != null
                ? new Intl.NumberFormat("en-IN", {
                    style: "currency",
                    currency: "INR",
                    maximumFractionDigits: 0,
                  }).format(Number(value))
                : ""
            }
            contentStyle={{
              borderRadius: 8,
              border: "1px solid #e5e7eb",
              fontSize: 13,
            }}
          />
          <Legend
            wrapperStyle={{ fontSize: 12, paddingTop: 12 }}
            formatter={(value) =>
              value === "income" ? "Income" : "Expenses"
            }
          />
          <Bar dataKey="income" fill="#16A34A" radius={[4, 4, 0, 0]} />
          <Bar dataKey="expense" fill="#DC2626" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
      {showMonthHint && activeMonths < 3 && (
        <p className="mt-2 text-center text-xs text-gray-300">
          Chart fills up as you add transactions over months
        </p>
      )}
    </>
  );
}
