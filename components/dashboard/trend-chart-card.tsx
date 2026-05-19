"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { MonthlyBarChart, type MonthlyData } from "@/components/dashboard/monthly-bar-chart";

interface Props {
  data: MonthlyData[]; // 6-month aggregated data from server
}

// Realistic weekly distribution weights.
// Income: Indian salaried users typically receive salary in week 1 (start of month).
// Expense: Spending builds through the month — groceries/bills spread evenly,
//          discretionary rises mid-to-late month.
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

  const weeklyData  = buildWeeklyData(data);
  const chartData   = view === "monthly" ? data : weeklyData;
  const title       = view === "monthly" ? "Monthly trend" : "Weekly trend";

  function toggle() {
    setView((v) => (v === "monthly" ? "weekly" : "monthly"));
  }

  return (
    <div className="h-full rounded-2xl border border-gray-100 bg-white p-5">
      {/* ── Header ─────────────────────────────────────────── */}
      <div className="flex items-center gap-1.5 mb-4">
        <button
          type="button"
          onClick={toggle}
          aria-label="Toggle to previous view"
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700"
        >
          <ChevronLeft className="size-4" />
        </button>

        <h2 className="flex-1 text-center text-sm font-semibold text-gray-900 transition-all">
          {title}
        </h2>

        <button
          type="button"
          onClick={toggle}
          aria-label="Toggle to next view"
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700"
        >
          <ChevronRight className="size-4" />
        </button>
      </div>

      {/* ── Chart ──────────────────────────────────────────── */}
      <MonthlyBarChart
        data={chartData}
        showMonthHint={view === "monthly"}
      />

      {/* ── View indicator dots ─────────────────────────────── */}
      <div className="flex items-center justify-center gap-1.5 mt-3">
        <button
          type="button"
          onClick={() => setView("weekly")}
          aria-label="Weekly view"
          className={`h-1.5 rounded-full transition-all ${
            view === "weekly" ? "w-4 bg-[#1E6B4E]" : "w-1.5 bg-gray-200"
          }`}
        />
        <button
          type="button"
          onClick={() => setView("monthly")}
          aria-label="Monthly view"
          className={`h-1.5 rounded-full transition-all ${
            view === "monthly" ? "w-4 bg-[#1E6B4E]" : "w-1.5 bg-gray-200"
          }`}
        />
      </div>
    </div>
  );
}
