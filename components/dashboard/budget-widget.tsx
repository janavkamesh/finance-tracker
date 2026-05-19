"use client";

import { useState } from "react";
import { LayoutList } from "lucide-react";
import { formatINR, cn } from "@/lib/utils";
import { getCategoryIcon } from "@/lib/category-icons";
import { BudgetSetupDialog } from "@/components/dashboard/budget-setup-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

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

// ── Category breakdown modal ──────────────────────────────────────────────────

function BreakdownModal({
  open,
  onOpenChange,
  items,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: CategoryLimitItem[];
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-lg p-0 overflow-hidden"
        overlayClassName="bg-black/40 supports-backdrop-filter:backdrop-blur-sm"
        onClose={() => onOpenChange(false)}
      >
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-gray-100">
          <DialogTitle className="text-base font-semibold text-gray-900">
            Category Budget Breakdown
          </DialogTitle>
          <p className="text-xs text-gray-500">
            Spending vs. limit for each category this month.
          </p>
        </DialogHeader>

        <div className="px-6 py-5 space-y-5 max-h-[60vh] overflow-y-auto">
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
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md"
                      style={{ backgroundColor: item.color ? `${item.color}18` : "#f3f4f6" }}
                    >
                      <Icon
                        className="size-4"
                        style={{ color: item.color ?? "#6b7280" }}
                      />
                    </div>
                    <span className="text-sm font-semibold text-gray-800 truncate">
                      {item.name}
                    </span>
                    {over && (
                      <span className="shrink-0 rounded-full bg-red-100 px-1.5 py-0.5 text-[10px] font-bold text-red-600">
                        Over
                      </span>
                    )}
                  </div>
                  <span className={cn("text-sm font-bold tabular-nums shrink-0 ml-2", pctColor)}>
                    {pct.toFixed(0)}%
                  </span>
                </div>

                <div className="h-2 w-full rounded-full bg-gray-100 mb-1.5">
                  <div
                    className={cn("h-2 rounded-full transition-all", barColor)}
                    style={{ width: `${pct}%` }}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500 tabular-nums">
                    {formatINR(item.spent)}{" "}
                    <span className="text-gray-400">of {formatINR(item.monthly_limit)}</span>
                  </span>
                  <span className={cn("text-xs tabular-nums", over ? "text-red-500" : "text-gray-400")}>
                    {over
                      ? `${formatINR(item.spent - item.monthly_limit)} over`
                      : `${formatINR(remaining)} left`}
                  </span>
                </div>
              </div>
            );
          })}

          {items.length === 0 && (
            <p className="text-sm text-gray-500 text-center py-8">
              No category limits configured yet.
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
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

  // daysRemaining is intentionally accepted via props for future use; the
  // dashboard glance-view shows only "remaining" to reduce text clutter.
  void daysRemaining;

  const hasBreakdown = categoryLimitItems.length > 0;

  return (
    <div className="rounded-xl border border-gray-100 bg-white px-5 py-4 mb-4">
      {/* ── Two-column split: data (left) | action button (right) ── */}
      <div className="flex items-stretch gap-5">
        {/* ─── LEFT: title row, progress bar, secondary meta row ─── */}
        <div className="flex-1 min-w-0">
          {/* Title + edit + rollover badge + pct used */}
          <div className="flex items-center gap-2 mb-2.5 flex-wrap">
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

          {/* Progress bar */}
          <div className="h-2 w-full rounded-full bg-gray-100">
            <div
              className={cn("h-2 rounded-full transition-all", barColor)}
              style={{ width: `${pct}%` }}
            />
          </div>

          {/* Secondary meta row — single, focused glance-value beneath the bar */}
          <div className="mt-2">
            <span
              className={cn(
                "text-xs tabular-nums",
                over ? "text-red-500 font-medium" : "text-gray-500"
              )}
            >
              {over
                ? `${formatINR(monthExpense - displayBudget)} over budget`
                : `${formatINR(remaining)} remaining`}
            </span>
          </div>
        </div>

        {/* ─── RIGHT: isolated, vertically-centered action button ─── */}
        {hasBreakdown && (
          <div className="flex shrink-0 items-center border-l border-gray-100 pl-5">
            <button
              type="button"
              onClick={() => setBreakdownOpen(true)}
              className="inline-flex items-center gap-2 rounded-lg border border-[#1E6B4E]/25 bg-white px-3.5 py-2 text-xs font-semibold text-[#1E6B4E] shadow-sm transition-all hover:border-[#1E6B4E]/50 hover:bg-[#1E6B4E]/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1E6B4E]/40"
              aria-label="Open category breakdown"
            >
              <LayoutList className="size-3.5" />
              Category Breakdown
            </button>
          </div>
        )}
      </div>

      {hasBreakdown && (
        <BreakdownModal
          open={breakdownOpen}
          onOpenChange={setBreakdownOpen}
          items={categoryLimitItems}
        />
      )}
    </div>
  );
}
