"use client";

import { useState, useRef, useEffect } from "react";
import { LayoutList, ChevronDown, ChevronUp } from "lucide-react";
import { formatINR, cn } from "@/lib/utils";
import { getCategoryIcon } from "@/lib/category-icons";
import { BudgetSetupDialog } from "@/components/dashboard/budget-setup-dialog";

// ── Types ─────────────────────────────────────────────────────────────────────

interface Category {
  id: string;
  name: string;
  type: "income" | "expense" | "both";
  color?: string | null;
  monthly_limit?: number | null;
  icon?: string | null;
}

export interface CategoryLimitItem {
  id: string;
  name: string;
  color: string | null;
  icon: string | null;
  monthly_limit: number;
  spent: number;
}

interface Props {
  monthExpense: number;
  budget: number;           // effective budget (base + rollover)
  baseBudget: number;
  rolloverAmount: number;
  daysRemaining: number;
  categoryLimitItems: CategoryLimitItem[];
  /** Serialised from profiles.category_limits */
  categoryLimits: Record<string, number>;
  categories: Category[];
  rolloverEnabled: boolean;
}

// ── Category breakdown popover ─────────────────────────────────────────────

function BreakdownPopover({
  items,
  onClose,
}: {
  items: CategoryLimitItem[];
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onMouseDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, [onClose]);

  // Escape key closes the popover without bubbling to parent
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.stopImmediatePropagation();
        onClose();
      }
    }
    document.addEventListener("keydown", onKey, true);
    return () => document.removeEventListener("keydown", onKey, true);
  }, [onClose]);

  if (items.length === 0) return null;

  return (
    <div
      ref={ref}
      role="dialog"
      aria-label="Category budget breakdown"
      className="absolute right-0 top-full mt-2 z-30 w-72 sm:w-80 rounded-xl border border-gray-200 bg-white shadow-xl overflow-hidden"
    >
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-100 bg-gray-50/60">
        <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
          Category breakdown
        </p>
      </div>

      {/* Items */}
      <div className="px-4 py-3 space-y-4 max-h-72 overflow-y-auto">
        {items.map((item) => {
          const pct = Math.min((item.spent / item.monthly_limit) * 100, 100);
          const over = item.spent > item.monthly_limit;
          const warn = !over && pct >= 80;
          const remaining = Math.max(0, item.monthly_limit - item.spent);

          const barColor = over
            ? "bg-red-500"
            : warn
              ? "bg-amber-500"
              : "bg-[#1E6B4E]";
          const pctColor = over
            ? "text-red-600"
            : warn
              ? "text-amber-600"
              : "text-[#1E6B4E]";

          const Icon = getCategoryIcon({ name: item.name, icon: item.icon ?? undefined });

          return (
            <div key={item.id}>
              {/* Row 1: icon + name + pct badge */}
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2 min-w-0">
                  <div
                    className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md"
                    style={{ backgroundColor: item.color ? `${item.color}18` : "#f3f4f6" }}
                  >
                    <Icon
                      className="size-3.5"
                      style={{ color: item.color ?? "#6b7280" }}
                    />
                  </div>
                  <span className="text-xs font-semibold text-gray-800 truncate">
                    {item.name}
                  </span>
                  {over && (
                    <span className="shrink-0 rounded-full bg-red-100 px-1.5 py-0.5 text-[10px] font-bold text-red-600">
                      Over
                    </span>
                  )}
                </div>
                <span className={cn("text-xs font-bold tabular-nums shrink-0 ml-2", pctColor)}>
                  {pct.toFixed(0)}%
                </span>
              </div>

              {/* Progress bar */}
              <div className="h-1.5 w-full rounded-full bg-gray-100 mb-1.5">
                <div
                  className={cn("h-1.5 rounded-full transition-all", barColor)}
                  style={{ width: `${pct}%` }}
                />
              </div>

              {/* Row 2: spent / limit + remaining */}
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-gray-500 tabular-nums">
                  {formatINR(item.spent)}{" "}
                  <span className="text-gray-400">of {formatINR(item.monthly_limit)}</span>
                </span>
                <span className={cn("text-[11px] tabular-nums", over ? "text-red-500" : "text-gray-400")}>
                  {over
                    ? `${formatINR(item.spent - item.monthly_limit)} over`
                    : `${formatINR(remaining)} left`}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Main budget widget ─────────────────────────────────────────────────────

export function BudgetWidget({
  monthExpense,
  budget,
  baseBudget,
  rolloverAmount,
  daysRemaining,
  categoryLimitItems,
  categoryLimits,
  categories,
  rolloverEnabled,
}: Props) {
  const [breakdownOpen, setBreakdownOpen] = useState(false);
  // Optimistic budget: set immediately on save, cleared once server confirms
  // via revalidatePath (which updates the `budget` prop from the server).
  const [optimisticBudget, setOptimisticBudget] = useState<number | null>(null);

  // All display calculations use displayBudget so the UI reacts instantly.
  const displayBudget = optimisticBudget ?? budget;

  const pct = Math.min((monthExpense / displayBudget) * 100, 100);
  const remaining = displayBudget - monthExpense;
  const over = monthExpense > displayBudget;

  const barColor =
    over || pct >= 95
      ? "bg-red-500"
      : pct >= 80
        ? "bg-amber-500"
        : "bg-[#1E6B4E]";
  const textColor =
    over || pct >= 95
      ? "text-red-600"
      : pct >= 80
        ? "text-amber-600"
        : "text-[#1E6B4E]";

  const safeToSpend =
    !over && remaining > 0 ? Math.floor(remaining / daysRemaining) : 0;

  const hasBreakdown = categoryLimitItems.length > 0;

  return (
    <div className="rounded-xl border border-gray-100 bg-white px-5 py-4 mb-6">

      {/* ── Header row: title + edit + rollover + pct used ── */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-gray-900">Monthly budget</span>
          <BudgetSetupDialog
            currentBudget={baseBudget}
            rolloverEnabled={rolloverEnabled}
            categories={categories}
            categoryLimits={categoryLimits}
            onOptimisticSave={(newBase) =>
              setOptimisticBudget(newBase + rolloverAmount)
            }
            onOptimisticRollback={() => setOptimisticBudget(null)}
          />
          {rolloverAmount > 0 && (
            <span className="text-xs font-medium text-[#1E6B4E] tabular-nums">
              +{formatINR(rolloverAmount)} rollover
            </span>
          )}
          <span className={cn("text-xs font-medium tabular-nums", textColor)}>
            {pct.toFixed(0)}% used
          </span>
        </div>
        <span className="text-xs text-gray-500 tabular-nums">
          {formatINR(monthExpense)}{" "}
          <span className="text-gray-400">of {formatINR(displayBudget)}</span>
        </span>
      </div>

      {/* ── Progress bar row + Category Breakdown button ── */}
      {/*
          Layout: the bar is flex-1 so it fills all remaining space; the
          "Category Breakdown" button sits to its right as a shrink-0 sibling.
          The relative wrapper is full-width so the popover's right-0 aligns
          it to the card's right edge, not just the button edge.
      */}
      <div className="relative flex items-center gap-3">
        {/* Progress bar — fills remaining row width */}
        <div className="h-2 flex-1 min-w-0 rounded-full bg-gray-100">
          <div
            className={cn("h-2 rounded-full transition-all", barColor)}
            style={{ width: `${pct}%` }}
          />
        </div>

        {/* Category Breakdown button — prominent, anchors the popover */}
        {hasBreakdown && (
          <>
            <button
              type="button"
              onClick={() => setBreakdownOpen((v) => !v)}
              className={cn(
                "inline-flex shrink-0 items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold shadow-sm transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1E6B4E]/40",
                breakdownOpen
                  ? "border-[#1E6B4E]/50 bg-[#1E6B4E]/8 text-[#1E6B4E]"
                  : "border-[#1E6B4E]/25 bg-white text-[#1E6B4E] hover:border-[#1E6B4E]/50 hover:bg-[#1E6B4E]/5"
              )}
              aria-expanded={breakdownOpen}
              aria-label="Toggle category breakdown"
            >
              <LayoutList className="size-3.5" />
              Category Breakdown
              {breakdownOpen
                ? <ChevronUp className="size-3" />
                : <ChevronDown className="size-3" />
              }
            </button>

            {breakdownOpen && (
              <BreakdownPopover
                items={categoryLimitItems}
                onClose={() => setBreakdownOpen(false)}
              />
            )}
          </>
        )}
      </div>

      {/* ── Footer row: remaining/over + safe-to-spend ── */}
      <div className="mt-1.5 flex items-center justify-between gap-3">
        <p
          className={cn(
            "text-xs tabular-nums",
            over ? "text-red-600 font-medium" : "text-gray-400"
          )}
        >
          {over
            ? `${formatINR(monthExpense - displayBudget)} over budget`
            : `${formatINR(remaining)} remaining`}
        </p>

        {safeToSpend > 0 && (
          <span className="inline-flex items-center gap-1 rounded-full bg-[#1E6B4E]/8 px-2.5 py-0.5 text-xs font-semibold text-[#1E6B4E] tabular-nums">
            Safe to spend today: {formatINR(safeToSpend)}
          </span>
        )}
      </div>

    </div>
  );
}
