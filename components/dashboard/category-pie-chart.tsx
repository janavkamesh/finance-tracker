"use client";

import { useState } from "react";
import { PieChart, Pie, Cell, Sector, Tooltip, ResponsiveContainer } from "recharts";
import { cn, formatINR } from "@/lib/utils";
import { getCategoryIcon } from "@/lib/category-icons";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface SliceProps {
  cx?: number;
  cy?: number;
  innerRadius?: number;
  outerRadius?: number;
  startAngle?: number;
  endAngle?: number;
  fill?: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function ActiveSlice(props: any) {
  const { cx = 0, cy = 0, innerRadius = 0, outerRadius = 0, startAngle = 0, endAngle = 0, fill = "" } = props as SliceProps;
  return (
    <Sector
      cx={cx}
      cy={cy}
      innerRadius={innerRadius}
      outerRadius={outerRadius + 6}
      startAngle={startAngle}
      endAngle={endAngle}
      fill={fill}
      stroke="none"
    />
  );
}

export interface CategorySlice {
  name: string;
  value: number;
  color: string;
  icon?: string | null;
}

const FALLBACK_COLORS = [
  "#1E6B4E",
  "#DC2626",
  "#D97706",
  "#2563EB",
  "#7C3AED",
  "#DB2777",
  "#059669",
  "#ea580c",
];

const TOP_N = 5;

type View = "weekly" | "monthly";

function LegendRow({
  item,
  index,
  total,
}: {
  item: CategorySlice;
  index: number;
  total: number;
}) {
  const color = item.color || FALLBACK_COLORS[index % FALLBACK_COLORS.length];
  const Icon = getCategoryIcon({ name: item.name, icon: item.icon });
  return (
    <li className="flex items-center justify-between text-sm">
      <div className="flex items-center gap-2 min-w-0">
        <span
          className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full"
          style={{ backgroundColor: `${color}20`, color }}
        >
          <Icon className="size-3" />
        </span>
        <span className="truncate text-gray-700">{item.name}</span>
      </div>
      <div className="flex items-center gap-2 shrink-0 ml-2">
        <span className="text-gray-400 text-xs">
          {((item.value / total) * 100).toFixed(0)}%
        </span>
        <span className="font-medium tabular-nums text-gray-900">
          {formatINR(item.value)}
        </span>
      </div>
    </li>
  );
}

export function CategoryPieChart({
  data,
  weeklyData,
}: {
  data: CategorySlice[];
  weeklyData: CategorySlice[];
}) {
  const [view, setView] = useState<View>("monthly");
  const [viewAllOpen, setViewAllOpen] = useState(false);

  const activeData = view === "weekly" ? weeklyData : data;
  const title = view === "weekly" ? "This week's expenses" : "This month's expenses";

  const cardHeader = (
    <div className="flex items-center justify-between gap-3 mb-2">
      <h2 className="text-sm font-semibold text-gray-900 whitespace-nowrap">{title}</h2>

      {/* Segmented control — identical to TrendChartCard */}
      <div className="flex h-7 items-center gap-0.5 rounded-full bg-gray-100 p-0.5 shrink-0">
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
  );

  if (activeData.length === 0) {
    return (
      <div className="rounded-2xl border border-gray-100 bg-white p-4">
        {cardHeader}
        <div className="flex h-[200px] flex-col items-center justify-center gap-2 text-center">
          <svg className="w-8 h-8 text-gray-200" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6a7.5 7.5 0 107.5 7.5h-7.5V6z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 10.5H21A7.5 7.5 0 0013.5 3v7.5z" />
          </svg>
          <p className="text-sm font-medium text-gray-400">Where your money went</p>
          <p className="text-xs text-gray-300">Log an expense to see your category breakdown</p>
        </div>
      </div>
    );
  }

  const total = activeData.reduce((s, d) => s + d.value, 0);
  const sorted = [...activeData].sort((a, b) => b.value - a.value);
  const visible = sorted.slice(0, TOP_N);
  const hasOverflow = sorted.length > TOP_N;
  const periodLabel = view === "weekly" ? "this week" : "this month";

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-4">
      {cardHeader}
      <div className="flex flex-col gap-3">
        <ResponsiveContainer width="100%" height={170}>
          <PieChart>
            <Pie
              data={sorted}
              cx="50%"
              cy="50%"
              innerRadius={48}
              outerRadius={75}
              paddingAngle={2}
              dataKey="value"
              stroke="none"
              activeShape={ActiveSlice}
            >
              {sorted.map((entry, i) => (
                <Cell
                  key={entry.name}
                  fill={entry.color || FALLBACK_COLORS[i % FALLBACK_COLORS.length]}
                  stroke="none"
                />
              ))}
            </Pie>
            <Tooltip
              formatter={(value) => value != null ? formatINR(Number(value)) : ""}
              contentStyle={{
                borderRadius: 8,
                border: "1px solid #e5e7eb",
                fontSize: 13,
              }}
            />
          </PieChart>
        </ResponsiveContainer>

        <ul className="space-y-2">
          {visible.map((item, i) => (
            <LegendRow key={item.name} item={item} index={i} total={total} />
          ))}
        </ul>

        {hasOverflow && (
          <button
            type="button"
            onClick={() => setViewAllOpen(true)}
            className="mt-1 w-full rounded-lg border border-gray-100 bg-gray-50 px-3 py-2 text-xs font-semibold text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1E6B4E]/30"
            aria-label={`View all ${sorted.length} categories`}
          >
            View all {sorted.length} categories
          </button>
        )}

        <Dialog open={viewAllOpen} onOpenChange={setViewAllOpen}>
          <DialogContent
            className="sm:max-w-lg p-0 overflow-hidden"
            overlayClassName="bg-black/40 supports-backdrop-filter:backdrop-blur-sm"
            onClose={() => setViewAllOpen(false)}
          >
            <DialogHeader className="px-6 pt-6 pb-4 border-b border-gray-100">
              <DialogTitle className="text-base font-semibold text-gray-900">
                Expenses by category
              </DialogTitle>
              <p className="text-xs text-gray-500 tabular-nums">
                {sorted.length} categories · {formatINR(total)} total {periodLabel}
              </p>
            </DialogHeader>

            <ul className="px-6 py-5 space-y-3 max-h-[60vh] overflow-y-auto">
              {sorted.map((item, i) => (
                <LegendRow key={item.name} item={item} index={i} total={total} />
              ))}
            </ul>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
