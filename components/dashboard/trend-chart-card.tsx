"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { MonthlyBarChart, type MonthlyData } from "@/components/dashboard/monthly-bar-chart";

interface Transaction {
  date: string;   // "YYYY-MM-DD"
  type: string;   // "income" | "expense"
  amount: number | string;
}

interface Props {
  data: MonthlyData[];           // 6-month aggregated data for monthly view
  transactions: Transaction[];   // current-month transactions for weekly bucketing
}

function getWeekBucket(day: number): number {
  if (day <= 7)  return 0;
  if (day <= 14) return 1;
  if (day <= 21) return 2;
  return 3;
}

function buildWeeklyData(transactions: Transaction[]): MonthlyData[] {
  const buckets: MonthlyData[] = [
    { month: "Week 1", income: 0, expense: 0 },
    { month: "Week 2", income: 0, expense: 0 },
    { month: "Week 3", income: 0, expense: 0 },
    { month: "Week 4", income: 0, expense: 0 },
  ];

  for (const t of transactions) {
    const day = parseInt(t.date.split("-")[2], 10);
    const bucket = getWeekBucket(day);
    const amount = Number(t.amount);
    if (t.type === "income") {
      buckets[bucket].income += amount;
    } else {
      buckets[bucket].expense += amount;
    }
  }

  return buckets;
}

type View = "weekly" | "monthly";

export function TrendChartCard({ data, transactions }: Props) {
  const [view, setView] = useState<View>("weekly");

  const weeklyData = buildWeeklyData(transactions);
  const chartData  = view === "monthly" ? data : weeklyData;

  return (
    <div className="h-full rounded-2xl border border-gray-100 bg-white p-4">
      {/* ── Header: title left, segmented control right ─────── */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-gray-900">
          {view === "monthly" ? "Monthly trend" : "Weekly trend"}
        </h2>

        {/* Segmented control — pill toggle */}
        <div className="flex h-7 items-center gap-0.5 rounded-full bg-gray-100 p-0.5">
          <button
            type="button"
            onClick={() => setView("weekly")}
            className={cn(
              "h-6 rounded-full px-3 text-xs font-semibold transition-all",
              view === "weekly"
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            )}
          >
            Weekly
          </button>
          <button
            type="button"
            onClick={() => setView("monthly")}
            className={cn(
              "h-6 rounded-full px-3 text-xs font-semibold transition-all",
              view === "monthly"
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            )}
          >
            Monthly
          </button>
        </div>
      </div>

      {/* ── Chart ──────────────────────────────────────────── */}
      <MonthlyBarChart
        data={chartData}
        showMonthHint={view === "monthly"}
      />
    </div>
  );
}
