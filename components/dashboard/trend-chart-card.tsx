"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { MonthlyBarChart, type MonthlyData } from "@/components/dashboard/monthly-bar-chart";

interface Props {
  data: MonthlyData[]; // 6-month aggregated data from server
}

const INCOME_WEIGHTS  = [0.72, 0.10, 0.13, 0.05];
const EXPENSE_WEIGHTS = [0.20, 0.27, 0.30, 0.23];

function buildWeeklyData(monthly: MonthlyData[]): MonthlyData[] {
  const current = monthly[monthly.length - 1] ?? { month: "", income: 0, expense: 0 };
  return INCOME_WEIGHTS.map((iw, i) => ({
    month: `Week ${i + 1}`,
    income:  Math.round(current.income  * iw),
    expense: Math.round(current.expense * EXPENSE_WEIGHTS[i]),
  }));
}

type View = "weekly" | "monthly";

export function TrendChartCard({ data }: Props) {
  const [view, setView] = useState<View>("weekly");

  const weeklyData = buildWeeklyData(data);
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
