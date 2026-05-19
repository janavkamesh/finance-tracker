"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { PieChart, Pie, Cell, Sector, Tooltip, ResponsiveContainer } from "recharts";
import { cn, formatINR } from "@/lib/utils";
import { getCategoryIcon } from "@/lib/category-icons";

function getMonthOptions() {
  const now = new Date();
  return Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    return {
      label: d.toLocaleDateString("en-IN", { month: "long", year: "numeric" }),
      value: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
    };
  });
}
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

export function CategoryPieChart({ data }: { data: CategorySlice[] }) {
  const [viewAllOpen, setViewAllOpen] = useState(false);

  // Month dropdown
  const monthOptions = useMemo(() => getMonthOptions(), []);
  const [selectedMonth, setSelectedMonth] = useState(monthOptions[0].value);
  const [monthMenuOpen, setMonthMenuOpen] = useState(false);
  const monthMenuRef = useRef<HTMLDivElement>(null);
  const selectedLabel = monthOptions.find((m) => m.value === selectedMonth)?.label ?? "";

  useEffect(() => {
    if (!monthMenuOpen) return;
    function handleOutside(e: MouseEvent) {
      if (monthMenuRef.current && !monthMenuRef.current.contains(e.target as Node)) {
        setMonthMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [monthMenuOpen]);

  const cardHeader = (
    <div className="flex items-center justify-between mb-4">
      <h2 className="text-sm font-semibold text-gray-900">Expenses by category</h2>

      {/* Month dropdown — mirrors segmented control height/type treatment */}
      <div className="relative" ref={monthMenuRef}>
        <button
          type="button"
          onClick={() => setMonthMenuOpen((s) => !s)}
          className={cn(
            "flex h-7 items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3 text-xs font-semibold text-gray-600 transition-colors hover:border-gray-300 hover:text-gray-900",
            monthMenuOpen && "border-gray-300 text-gray-900"
          )}
        >
          {selectedLabel}
          <ChevronDown className="size-3 text-gray-400 shrink-0" />
        </button>
        {monthMenuOpen && (
          <div className="absolute right-0 top-8 z-20 min-w-[152px] rounded-xl border border-gray-200 bg-white shadow-lg py-1">
            {monthOptions.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  setSelectedMonth(opt.value);
                  setMonthMenuOpen(false);
                }}
                className={cn(
                  "flex w-full items-center px-3.5 py-2 text-xs text-gray-700 hover:bg-gray-50 transition-colors",
                  selectedMonth === opt.value && "font-semibold text-[#1E6B4E]"
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  if (data.length === 0) {
    return (
      <div className="rounded-2xl border border-gray-100 bg-white p-5">
        {cardHeader}
        <div className="flex h-[240px] flex-col items-center justify-center gap-2 text-center">
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

  const total = data.reduce((s, d) => s + d.value, 0);
  // Defensive sort — the page already pre-sorts but enforce here so the
  // Top-N truncation is always against highest-spend descending.
  const sorted = [...data].sort((a, b) => b.value - a.value);
  const visible = sorted.slice(0, TOP_N);
  const hasOverflow = sorted.length > TOP_N;

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-5">
      {cardHeader}
    <div className="flex flex-col gap-4">
      <ResponsiveContainer width="100%" height={200}>
        <PieChart>
          <Pie
            data={sorted}
            cx="50%"
            cy="50%"
            innerRadius={55}
            outerRadius={85}
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

      {/* Top-N legend — fixed height regardless of total category count */}
      <ul className="space-y-2">
        {visible.map((item, i) => (
          <LegendRow key={item.name} item={item} index={i} total={total} />
        ))}
      </ul>

      {/* Progressive disclosure: opens a modal with the full list. The card
          itself never grows vertically, so it stays aligned with the chart
          next to it. */}
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
              {sorted.length} categories · {formatINR(total)} total this month
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
