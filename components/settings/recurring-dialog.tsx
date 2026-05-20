"use client";

import { useState, useEffect, useCallback } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { DatePicker } from "@/components/ui/date-picker";
import { parse, format } from "date-fns";
import { toast } from "sonner";
import { Plus, Pencil, Calculator, Delete } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { recurringSchema, type RecurringInput } from "@/lib/validations/recurring";
import { addRecurring, updateRecurring } from "@/actions/recurring";
import { CategoryPicker } from "@/components/transactions/category-picker";

function safeCalc(expr: string): number | null {
  const cleaned = expr.trim();
  if (!cleaned) return null;
  if (!/^[\d+\-*/×÷.()\s]+$/.test(cleaned)) return null;
  const jsExpr = cleaned.replace(/×/g, "*").replace(/÷/g, "/");
  try {
    // eslint-disable-next-line @typescript-eslint/no-implied-eval
    const result = Function('"use strict"; return (' + jsExpr + ")")() as number;
    return typeof result === "number" && isFinite(result) ? result : null;
  } catch {
    return null;
  }
}

function CalcPanel({ onResult }: { onResult: (v: string) => void }) {
  const [expr, setExpr] = useState("");

  const press = useCallback((key: string) => {
    if (key === "C") { setExpr(""); return; }
    if (key === "←") { setExpr((e) => e.slice(0, -1)); return; }
    if (key === "=") {
      const result = safeCalc(expr);
      if (result !== null) {
        const str = Number.isInteger(result) ? String(result) : result.toFixed(2);
        onResult(str);
        setExpr(str);
      }
      return;
    }
    setExpr((e) => e + key);
  }, [expr, onResult]);

  const display = expr || "0";
  const preview = expr ? safeCalc(expr) : null;

  const rows = [
    ["7", "8", "9", "÷"],
    ["4", "5", "6", "×"],
    ["1", "2", "3", "-"],
    [".", "0", "←", "+"],
    ["C", "", "", "="],
  ];

  return (
    <div className="mt-2 rounded-xl p-3 shadow-sm" style={{ border: '1px solid var(--border-default)', background: 'var(--bg-elevated)' }}>
      <div className="mb-2 rounded-lg px-3 py-2 text-right" style={{ border: '1px solid var(--border-default)', background: 'var(--bg-input)' }}>
        <p className="text-xs h-4 tabular-nums truncate" style={{ color: 'var(--text-tertiary)' }}>{expr || ""}</p>
        <p className="text-lg font-bold tabular-nums" style={{ color: 'var(--text-primary)' }}>
          {preview !== null && expr !== String(preview) ? `= ${preview}` : display}
        </p>
      </div>
      <div className="grid grid-cols-4 gap-1.5">
        {rows.flatMap((row, ri) =>
          row.map((key, ci) => {
            if (!key) return <div key={`${ri}-${ci}`} />;
            const isOp = ["÷", "×", "-", "+"].includes(key);
            const isEq = key === "=";
            const isClear = key === "C";
            const isDel = key === "←";
            const calcStyle = isEq
              ? { background: 'var(--cta-primary-bg)', color: 'var(--cta-primary-text)' }
              : isOp
                ? { background: 'var(--cta-secondary-bg)', color: 'var(--cta-secondary-text)' }
                : isClear
                  ? {}
                  : { background: 'var(--bg-raised)', color: 'var(--text-primary)', border: '1px solid var(--border-default)' };
            return (
              <button
                key={`${ri}-${ci}`}
                type="button"
                onClick={() => press(key)}
                className={cn(
                  "flex h-10 w-full items-center justify-center rounded-lg text-sm font-semibold transition-colors select-none",
                  isClear
                    ? "bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/50"
                    : "hover:opacity-90",
                )}
                style={isClear ? {} : calcStyle}
              >
                {isDel ? <Delete className="size-4" /> : key}
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}

interface Category {
  id: string;
  name: string;
  type: "income" | "expense" | "both";
}

interface Recurring {
  id: string;
  type: "income" | "expense";
  amount: number;
  description: string;
  category_id: string;
  frequency: "weekly" | "monthly" | "yearly";
  next_due_date: string;
}

interface Props {
  categories: Category[];
  recurring?: Recurring;
  triggerVariant?: "primary" | "secondary";
  triggerLabel?: string;
}

function todayLocal() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const FREQUENCY_LABELS = { weekly: "Weekly", monthly: "Monthly", yearly: "Yearly" };

export function RecurringDialog({ categories, recurring, triggerVariant = "primary", triggerLabel }: Props) {
  const [open, setOpen] = useState(false);
  const isEdit = !!recurring;

  const [showCalc, setShowCalc] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    watch,
    reset,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<RecurringInput>({
    resolver: zodResolver(recurringSchema),
    defaultValues: isEdit
      ? {
          type: recurring.type,
          amount: Number(recurring.amount),
          description: recurring.description,
          category_id: recurring.category_id,
          frequency: recurring.frequency,
          next_due_date: recurring.next_due_date,
        }
      : {
          type: "expense",
          amount: undefined,
          description: "",
          category_id: "",
          frequency: "monthly",
          next_due_date: todayLocal(),
        },
  });

  const selectedType = watch("type");
  const filteredCategories = categories.filter(
    (c) => c.type === selectedType || c.type === "both"
  );

  useEffect(() => {
    if (open && !isEdit) {
      reset({
        type: "expense",
        amount: undefined,
        description: "",
        category_id: "",
        frequency: "monthly",
        next_due_date: todayLocal(),
      });
    }
  }, [open, isEdit, reset]);

  function onSubmit(data: RecurringInput) {
    const fd = new FormData();
    fd.set("type", data.type);
    fd.set("amount", String(data.amount));
    fd.set("description", data.description);
    fd.set("category_id", data.category_id);
    fd.set("frequency", data.frequency);
    fd.set("next_due_date", data.next_due_date);

    setOpen(false);
    toast.success(isEdit ? "Recurring updated" : "Recurring transaction added");

    const action = isEdit ? updateRecurring(recurring!.id, fd) : addRecurring(fd);
    action.then((result) => {
      if (result?.error) toast.error(`Failed — ${result.error}`);
    });
  }

  const inputClass =
    "w-full rounded-lg border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1E6B4E]/30 focus:border-[#1E6B4E] transition-colors";

  return (
    <>
      {isEdit ? (
        <button
          onClick={() => setOpen(true)}
          className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
          aria-label="Edit recurring"
        >
          <Pencil className="size-3.5" />
        </button>
      ) : (
        <button
          onClick={() => setOpen(true)}
          className={cn(
            "inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-semibold",
            triggerVariant === "secondary"
              ? "border border-[#1E6B4E]/25 bg-white text-[#1E6B4E] shadow-sm transition-all hover:border-[#1E6B4E]/50 hover:bg-[#1E6B4E]/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1E6B4E]/40"
              : "bg-[#1E6B4E] text-white transition-colors hover:bg-[#185c43] focus:outline-none focus:ring-2 focus:ring-[#1E6B4E]/50"
          )}
        >
          <Plus className="size-4" />
          {triggerLabel ?? "Add recurring"}
        </button>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          className="sm:max-w-md"
        >
          <DialogHeader>
            <DialogTitle>{isEdit ? "Edit Recurring" : "Add Recurring Transaction"}</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4 pt-1">
            {/* Type */}
            <Controller
              control={control}
              name="type"
              render={({ field }) => (
                <div className="grid grid-cols-2 gap-2">
                  {(["expense", "income"] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => field.onChange(t)}
                      className={cn(
                        "rounded-lg py-2 text-sm font-medium capitalize transition-colors",
                        field.value === t
                          ? t === "expense"
                            ? "bg-red-100 text-red-700 ring-1 ring-red-200"
                            : "bg-green-100 text-green-700 ring-1 ring-green-200"
                          : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                      )}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              )}
            />

            {/* Amount + Calculator */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Amount (₹)</label>
              <div className="relative">
                <input
                  type="text"
                  inputMode="decimal"
                  placeholder="0.00"
                  {...register("amount", {
                    setValueAs: (v) => (v === "" || v == null ? undefined : Number(v)),
                  })}
                  className={cn(inputClass, "pr-10")}
                />
                <button
                  type="button"
                  onClick={() => setShowCalc((s) => !s)}
                  className={cn(
                    "absolute right-2.5 top-1/2 -translate-y-1/2 flex h-6 w-6 items-center justify-center rounded-md transition-colors",
                    showCalc
                      ? "bg-[#1E6B4E] text-white"
                      : "hover:bg-black/5"
                  )}
                  aria-label="Toggle calculator"
                >
                  <Calculator className="size-3.5" />
                </button>
              </div>
              {errors.amount && (
                <p className="mt-1.5 text-xs text-red-600">{errors.amount.message}</p>
              )}
              {showCalc && (
                <CalcPanel
                  onResult={(v) => {
                    setValue("amount", Number(v), { shouldValidate: true });
                    setShowCalc(false);
                  }}
                />
              )}
            </div>

            {/* Category */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Category</label>
              <Controller
                control={control}
                name="category_id"
                render={({ field }) => (
                  <CategoryPicker
                    categories={filteredCategories}
                    value={field.value}
                    onChange={field.onChange}
                    error={errors.category_id?.message}
                  />
                )}
              />
              {errors.category_id && (
                <p className="mt-1.5 text-xs text-red-600">{errors.category_id.message}</p>
              )}
            </div>

            {/* Description (optional) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Description{" "}
                <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <input
                type="text"
                placeholder="e.g. Rent, Netflix, Salary"
                {...register("description")}
                className={inputClass}
              />
              {errors.description && (
                <p className="mt-1.5 text-xs text-red-600">{errors.description.message}</p>
              )}
            </div>

            {/* Frequency */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Frequency</label>
              <Controller
                control={control}
                name="frequency"
                render={({ field }) => (
                  <div className="grid grid-cols-3 gap-2">
                    {(["weekly", "monthly", "yearly"] as const).map((f) => (
                      <button
                        key={f}
                        type="button"
                        onClick={() => field.onChange(f)}
                        className={cn(
                          "rounded-lg py-2 text-xs font-medium capitalize transition-colors",
                          field.value === f
                            ? "bg-[#1E6B4E]/10 text-[#1E6B4E] ring-1 ring-[#1E6B4E]/20"
                            : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                        )}
                      >
                        {FREQUENCY_LABELS[f]}
                      </button>
                    ))}
                  </div>
                )}
              />
            </div>

            {/* Next due date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                {isEdit ? "Next due date" : "First occurrence"}
              </label>
              <Controller
                control={control}
                name="next_due_date"
                render={({ field }) => (
                  <DatePicker
                    value={field.value ? parse(field.value, "yyyy-MM-dd", new Date()) : null}
                    onChange={(date) => {
                      field.onChange(date ? format(date, "yyyy-MM-dd") : "");
                    }}
                    className={cn(inputClass, "py-2 text-left bg-white")}
                  />
                )}
              />
              {errors.next_due_date && (
                <p className="mt-1.5 text-xs text-red-600">{errors.next_due_date.message}</p>
              )}
            </div>

            <div className="flex justify-between pt-1">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="rounded-lg bg-[#1E6B4E] px-4 py-2 text-sm font-semibold text-white hover:bg-[#185c43] transition-colors"
              >
                {isEdit ? "Save changes" : "Add recurring"}
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
