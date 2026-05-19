"use client";

import { useState } from "react";
import { Pencil, PiggyBank, Plus, X } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { CustomSelect } from "@/components/ui/custom-select";
import { updateBudget, saveCategoryLimits } from "@/actions/budget";

interface Category {
  id: string;
  name: string;
  type: "income" | "expense" | "both";
  color?: string | null;
  monthly_limit?: number | null;
}

interface Props {
  currentBudget?: number | null;
  rolloverEnabled?: boolean;
  categories?: Category[];
}

interface CatBudgetRow {
  rowId: string;
  categoryId: string;
  amount: string;
}

const STYLES = [
  {
    label: "Conservative",
    emoji: "💪",
    desc: "High savings focus",
    pct: 0.5,
    savingsPct: "50%",
    ring: "ring-green-400",
    activeBg: "bg-green-50",
    activeBorder: "border-green-300",
    activeText: "text-green-700",
    chip: "bg-green-100 text-green-700",
  },
  {
    label: "Balanced",
    emoji: "⚖️",
    desc: "Recommended for most",
    pct: 0.65,
    savingsPct: "35%",
    ring: "ring-[#1E6B4E]",
    activeBg: "bg-[#1E6B4E]/5",
    activeBorder: "border-[#1E6B4E]/40",
    activeText: "text-[#1E6B4E]",
    chip: "bg-[#1E6B4E]/10 text-[#1E6B4E]",
  },
  {
    label: "Flexible",
    emoji: "🌊",
    desc: "More spending room",
    pct: 0.8,
    savingsPct: "20%",
    ring: "ring-amber-400",
    activeBg: "bg-amber-50",
    activeBorder: "border-amber-300",
    activeText: "text-amber-700",
    chip: "bg-amber-100 text-amber-700",
  },
];

function parseAmount(str: string): number {
  return Number(str.replace(/[^0-9.]/g, "")) || 0;
}

function formatDisplay(n: number): string {
  if (!n) return "";
  return n.toLocaleString("en-IN");
}

function newRowId() {
  return Math.random().toString(36).slice(2);
}

export function BudgetSetupDialog({ currentBudget, rolloverEnabled = false, categories = [] }: Props) {
  const [open, setOpen] = useState(false);
  const [income, setIncome] = useState("");
  const [budget, setBudget] = useState(
    currentBudget ? String(currentBudget) : ""
  );
  const [selectedStyle, setSelectedStyle] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [catBudgets, setCatBudgets] = useState<CatBudgetRow[]>([]);
  const [rollover, setRollover] = useState(rolloverEnabled);

  const incomeNum = parseAmount(income);
  const budgetNum = parseAmount(budget);
  const savingsAmt = incomeNum > 0 && budgetNum > 0 ? Math.max(0, incomeNum - budgetNum) : null;
  const savingsRate =
    incomeNum > 0 && budgetNum > 0
      ? Math.max(0, ((incomeNum - budgetNum) / incomeNum) * 100)
      : null;

  // Categories eligible for per-category budgets (expense + both only)
  const expenseCategories = categories.filter(
    (c) => c.type === "expense" || c.type === "both"
  );

  function getCategoryOptions(currentRowId: string) {
    const usedIds = new Set(
      catBudgets
        .filter((r) => r.rowId !== currentRowId && r.categoryId)
        .map((r) => r.categoryId)
    );
    return expenseCategories
      .filter((c) => !usedIds.has(c.id))
      .map((c) => ({ label: c.name, value: c.id }));
  }

  function addCatRow() {
    setCatBudgets((prev) => [...prev, { rowId: newRowId(), categoryId: "", amount: "" }]);
  }

  function removeCatRow(rowId: string) {
    setCatBudgets((prev) => prev.filter((r) => r.rowId !== rowId));
  }

  function updateCatRow(rowId: string, field: "categoryId" | "amount", value: string) {
    setCatBudgets((prev) =>
      prev.map((r) => (r.rowId === rowId ? { ...r, [field]: value } : r))
    );
  }

  function handleStyleSelect(idx: number) {
    setSelectedStyle(idx);
    if (incomeNum > 0) {
      setBudget(String(Math.round(incomeNum * STYLES[idx].pct)));
    }
  }

  function handleIncomeChange(val: string) {
    setIncome(val);
    if (selectedStyle !== null) {
      const num = parseAmount(val);
      if (num > 0) {
        setBudget(String(Math.round(num * STYLES[selectedStyle].pct)));
      }
    }
  }

  function handleOpen() {
    setBudget(currentBudget ? String(currentBudget) : "");
    setIncome("");
    setSelectedStyle(null);
    setRollover(rolloverEnabled);
    setOpen(true);
    // Pre-populate category rows from existing limits
    const existing = categories
      .filter((c) => c.monthly_limit != null && Number(c.monthly_limit) > 0)
      .map((c) => ({
        rowId: newRowId(),
        categoryId: c.id,
        amount: String(c.monthly_limit),
      }));
    setCatBudgets(existing);
  }

  async function handleSave() {
    if (!budgetNum || budgetNum <= 0) {
      toast.error("Please enter a valid budget amount");
      return;
    }
    setLoading(true);

    // Save monthly budget + rollover setting
    const fd = new FormData();
    fd.set("monthly_budget", String(budgetNum));
    fd.set("rollover_enabled", String(rollover));
    const result = await updateBudget(fd);

    if (result?.error) {
      toast.error(result.error);
      setLoading(false);
      return;
    }

    // Save category limits
    const validRows = catBudgets.filter(
      (r) => r.categoryId && Number(r.amount) > 0
    );
    const existingLimitIds = categories
      .filter((c) => c.monthly_limit != null && Number(c.monthly_limit) > 0)
      .map((c) => c.id);
    const updatedIds = validRows.map((r) => r.categoryId);
    const removedIds = existingLimitIds.filter((id) => !updatedIds.includes(id));

    const allUpdates: { categoryId: string; limit: number | null }[] = [
      ...validRows.map((r) => ({ categoryId: r.categoryId, limit: Number(r.amount) })),
      ...removedIds.map((id) => ({ categoryId: id, limit: null })),
    ];

    if (allUpdates.length > 0) {
      const catResult = await saveCategoryLimits(allUpdates);
      if (catResult?.error) {
        toast.error(catResult.error);
        setLoading(false);
        return;
      }
    }

    toast.success("Budget saved!");
    setLoading(false);
    setOpen(false);
  }

  const inputClass =
    "w-full rounded-lg border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1E6B4E]/30 focus:border-[#1E6B4E] transition-colors";

  const stepNum = (base: number) => (incomeNum > 0 ? base : base - 1);

  return (
    <>
      {currentBudget ? (
        <button
          onClick={handleOpen}
          className="flex h-6 w-6 items-center justify-center rounded-md text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
          title="Edit budget"
        >
          <Pencil className="size-3.5" />
        </button>
      ) : (
        <button
          onClick={handleOpen}
          className="inline-flex items-center gap-1.5 rounded-lg bg-[#1E6B4E] px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-[#185c43] transition-colors shrink-0 ml-4"
        >
          <PiggyBank className="size-3.5" />
          Set budget
        </button>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md p-0 gap-0 overflow-hidden">
          {/* Branded header */}
          <div className="bg-[#1E6B4E] px-6 py-5">
            <div className="flex items-center gap-2.5 mb-1">
              <PiggyBank className="size-5 text-white/80" />
              <h2 className="text-base font-bold text-white">
                {currentBudget ? "Edit monthly budget" : "Set up your monthly budget"}
              </h2>
            </div>
            <p className="text-xs text-white/65 leading-relaxed">
              A budget gives your spending a limit — helping you save more and stress less every month.
            </p>
          </div>

          <div className="px-6 py-5 space-y-5 overflow-y-auto max-h-[70vh]">

            {/* Step 1: Income */}
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#1E6B4E]/10 text-[10px] font-bold text-[#1E6B4E]">1</span>
                <label className="text-sm font-semibold text-gray-800">Monthly take-home income</label>
                <span className="text-xs text-gray-400">(optional)</span>
              </div>
              <p className="text-xs text-gray-400 mb-2 pl-7">
                Used only to calculate smart presets and savings rate — not stored.
              </p>
              <div className="relative pl-7">
                <span className="absolute left-[2.2rem] top-1/2 -translate-y-1/2 text-sm font-medium text-gray-400 pointer-events-none">₹</span>
                <input
                  type="text"
                  inputMode="numeric"
                  value={income}
                  onChange={(e) => handleIncomeChange(e.target.value)}
                  placeholder="50,000"
                  className={cn(inputClass, "pl-7")}
                />
              </div>
            </div>

            {/* Step 2: Spending style (visible when income is provided) */}
            {incomeNum > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#1E6B4E]/10 text-[10px] font-bold text-[#1E6B4E]">2</span>
                  <p className="text-sm font-semibold text-gray-800">Choose a spending style</p>
                </div>
                <div className="grid grid-cols-3 gap-2 pl-7">
                  {STYLES.map((s, i) => (
                    <button
                      key={s.label}
                      type="button"
                      onClick={() => handleStyleSelect(i)}
                      className={cn(
                        "rounded-xl border p-3 text-left transition-all",
                        selectedStyle === i
                          ? `${s.activeBg} ${s.activeBorder}`
                          : "border-gray-200 bg-white hover:bg-gray-50"
                      )}
                    >
                      <span className="text-lg leading-none">{s.emoji}</span>
                      <p className={cn(
                        "text-xs font-bold mt-1.5",
                        selectedStyle === i ? s.activeText : "text-gray-700"
                      )}>
                        {s.label}
                      </p>
                      <p className="text-[10px] text-gray-400 mt-0.5 leading-tight">{s.desc}</p>
                      <div className={cn("mt-2 rounded-md px-1.5 py-0.5 text-[10px] font-semibold inline-block", s.chip)}>
                        ₹{formatDisplay(Math.round(incomeNum * s.pct))}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Step 3 (or 2): Budget amount */}
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#1E6B4E]/10 text-[10px] font-bold text-[#1E6B4E]">
                  {incomeNum > 0 ? "3" : "2"}
                </span>
                <label className="text-sm font-semibold text-gray-800">
                  Monthly spending limit <span className="text-red-400">*</span>
                </label>
              </div>
              <div className="relative pl-7">
                <span className="absolute left-[2.2rem] top-1/2 -translate-y-1/2 text-lg font-bold text-gray-400 pointer-events-none">₹</span>
                <input
                  type="text"
                  inputMode="numeric"
                  value={budget}
                  onChange={(e) => {
                    setBudget(e.target.value);
                    setSelectedStyle(null);
                  }}
                  placeholder="30,000"
                  className="w-full rounded-lg border border-gray-200 bg-gray-50 pl-8 pr-3.5 py-3 text-xl font-bold text-gray-900 placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-[#1E6B4E]/30 focus:border-[#1E6B4E] transition-colors"
                />
              </div>
            </div>

            {/* Rollover toggle */}
            <div className="flex items-start gap-3 rounded-xl border border-gray-100 bg-gray-50/60 px-4 py-3">
              <input
                id="rollover_enabled"
                type="checkbox"
                checked={rollover}
                onChange={(e) => setRollover(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-gray-300 accent-[#1E6B4E] cursor-pointer"
              />
              <div>
                <label htmlFor="rollover_enabled" className="text-sm font-semibold text-gray-800 cursor-pointer">
                  Enable Rollover Budget
                </label>
                <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">
                  Unspent budget from the previous month carries forward and adds to this month&apos;s limit.
                </p>
              </div>
            </div>

            {/* Savings preview */}
            {savingsRate !== null && budgetNum > 0 && (
              <div className={cn(
                "rounded-xl px-4 py-4 border",
                savingsRate >= 20
                  ? "bg-green-50 border-green-100"
                  : savingsRate >= 10
                    ? "bg-amber-50 border-amber-100"
                    : "bg-red-50 border-red-100"
              )}>
                <div className="flex items-center justify-between mb-2">
                  <p className={cn(
                    "text-xs font-bold uppercase tracking-wide",
                    savingsRate >= 20 ? "text-green-600" : savingsRate >= 10 ? "text-amber-600" : "text-red-600"
                  )}>
                    {savingsRate >= 20 ? "✓ Great savings rate" : savingsRate >= 10 ? "⚠ Moderate savings" : "✗ Low savings rate"}
                  </p>
                  <span className={cn(
                    "text-sm font-bold tabular-nums",
                    savingsRate >= 20 ? "text-green-700" : savingsRate >= 10 ? "text-amber-700" : "text-red-700"
                  )}>
                    {savingsRate.toFixed(0)}%
                  </span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-white/60 mb-2">
                  <div
                    className={cn(
                      "h-1.5 rounded-full transition-all",
                      savingsRate >= 20 ? "bg-green-500" : savingsRate >= 10 ? "bg-amber-500" : "bg-red-500"
                    )}
                    style={{ width: `${Math.min(savingsRate, 100)}%` }}
                  />
                </div>
                <p className="text-xs text-gray-500">
                  You&apos;ll save{" "}
                  <span className="font-semibold text-gray-700">
                    ₹{savingsAmt!.toLocaleString("en-IN")}
                  </span>{" "}
                  per month.{" "}
                  {savingsRate < 10 && "Try reducing your budget to save more."}
                  {savingsRate >= 10 && savingsRate < 20 && "Aim for 20%+ to build wealth faster."}
                  {savingsRate >= 20 && "You're on track to build long-term wealth!"}
                </p>
              </div>
            )}

            {/* 50/30/20 rule tip */}
            {!incomeNum && (
              <div className="rounded-xl bg-gray-50 border border-gray-100 px-4 py-3.5">
                <p className="text-xs font-semibold text-gray-600 mb-1">💡 The 50/30/20 Rule</p>
                <p className="text-xs text-gray-500 leading-relaxed">
                  A popular guideline: spend <strong>50%</strong> on needs, <strong>30%</strong> on wants, and save <strong>20%</strong>. Enter your income above to get personalised suggestions.
                </p>
              </div>
            )}

            {/* ── Budget by category ─────────────────────────────────────── */}
            {expenseCategories.length > 0 && (
              <div className="border-t border-gray-100 pt-4">
                <div className="flex items-center gap-2 mb-1">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#1E6B4E]/10 text-[10px] font-bold text-[#1E6B4E]">
                    {stepNum(4)}
                  </span>
                  <p className="text-sm font-semibold text-gray-800">Budget by category</p>
                  <span className="text-xs text-gray-400">(optional)</span>
                </div>
                <p className="text-xs text-gray-400 mb-3 pl-7">
                  Set per-category limits to pinpoint exactly where you overspend.
                </p>

                {catBudgets.length > 0 && (
                  <div className="space-y-2 pl-7 mb-3">
                    {catBudgets.map((row) => {
                      const opts = getCategoryOptions(row.rowId);
                      const selectedCat = categories.find((c) => c.id === row.categoryId);
                      return (
                        <div key={row.rowId} className="flex items-center gap-2">
                          {/* Category selector */}
                          <div className="flex-1 min-w-0">
                            <CustomSelect
                              options={
                                selectedCat && !opts.find((o) => o.value === row.categoryId)
                                  ? [{ label: selectedCat.name, value: selectedCat.id }, ...opts]
                                  : opts
                              }
                              value={row.categoryId}
                              onChange={(v) => updateCatRow(row.rowId, "categoryId", v)}
                              placeholder="Select category"
                              className="w-full"
                            />
                          </div>
                          {/* Amount input */}
                          <div className="relative w-28 shrink-0">
                            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-sm text-gray-400 pointer-events-none">₹</span>
                            <input
                              type="text"
                              inputMode="numeric"
                              value={row.amount}
                              onChange={(e) =>
                                updateCatRow(
                                  row.rowId,
                                  "amount",
                                  e.target.value.replace(/[^0-9]/g, "")
                                )
                              }
                              placeholder="0"
                              className="w-full h-9 rounded-lg border border-gray-200 bg-gray-50 pl-6 pr-2.5 text-sm font-semibold text-gray-900 placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-[#1E6B4E]/30 focus:border-[#1E6B4E] transition-colors"
                            />
                          </div>
                          {/* Remove */}
                          <button
                            type="button"
                            onClick={() => removeCatRow(row.rowId)}
                            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors"
                          >
                            <X className="size-3.5" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Add row button */}
                {catBudgets.length < expenseCategories.length && (
                  <button
                    type="button"
                    onClick={addCatRow}
                    className="flex items-center gap-1.5 pl-7 text-sm font-medium text-[#1E6B4E] hover:text-[#185c43] transition-colors"
                  >
                    <div className="flex h-5 w-5 items-center justify-center rounded-full border-2 border-[#1E6B4E]/50">
                      <Plus className="size-3" />
                    </div>
                    Add category budget
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-between px-6 py-4 border-t border-gray-100 bg-gray-50/50">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-lg border border-gray-200 px-5 py-2.5 text-sm font-medium text-gray-600 transition-colors hover:bg-white"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={loading || !budgetNum}
              className="rounded-lg bg-[#1E6B4E] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#185c43] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Saving…" : "Save budget"}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
