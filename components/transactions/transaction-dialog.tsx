"use client";

import { useState, useEffect, useCallback } from "react";
import { useForm, Controller } from "react-hook-form";
import { CategoryPicker } from "@/components/transactions/category-picker";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Plus, Pencil, Calculator, Delete, Banknote, Smartphone, CreditCard, Building2, Wallet } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { transactionSchema, type TransactionInput } from "@/lib/validations/transaction";
import { addTransaction, updateTransaction } from "@/actions/transactions";

interface Category {
  id: string;
  name: string;
  type: "income" | "expense" | "both";
  color: string | null;
  user_id?: string | null;
  created_at?: string | null;
}

interface Transaction {
  id: string;
  type: "income" | "expense";
  amount: number | string;
  category_id: string;
  description: string;
  date: string;
  payment_method?: string | null;
}

interface OptimisticData {
  tempId: string;
  type: "income" | "expense";
  amount: number;
  category_id: string;
  description: string;
  date: string;
  payment_method?: string | null;
}

interface Props {
  categories: Category[];
  transaction?: Transaction;
  triggerVariant?: "primary" | "secondary";
  /** Active month in "YYYY-MM" format. When a past month is provided the date
   *  field defaults to the 1st of that month so the user stays in context.
   *  Current/future months fall back to today. */
  activeMonth?: string;
  /** Called immediately before the server action fires — lets the parent
   *  render the new row optimistically with a temp ID. */
  onOptimisticAdd?: (data: OptimisticData) => void;
  /** Called if the server action fails — removes the optimistic row. */
  onOptimisticRemove?: (tempId: string) => void;
}

// ── Payment methods ───────────────────────────────────────────────
const PAYMENT_METHODS = [
  { value: "cash",        label: "Cash",        icon: Banknote },
  { value: "upi",         label: "UPI",         icon: Smartphone },
  { value: "card",        label: "Card",        icon: CreditCard },
  { value: "net_banking", label: "Net Banking", icon: Building2 },
  { value: "wallet",      label: "Wallet",      icon: Wallet },
] as const;

// ── Safe arithmetic evaluator ─────────────────────────────────────
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

// ── Calculator panel ──────────────────────────────────────────────
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
    <div className="mt-2 rounded-xl border border-gray-200 bg-gray-50 p-3 shadow-sm">
      {/* Display */}
      <div className="mb-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-right">
        <p className="text-xs text-gray-400 h-4 tabular-nums truncate">
          {expr || ""}
        </p>
        <p className="text-lg font-bold text-gray-900 tabular-nums">
          {preview !== null && expr !== String(preview) ? `= ${preview}` : display}
        </p>
      </div>

      {/* Buttons */}
      <div className="grid grid-cols-4 gap-1.5">
        {rows.flatMap((row, ri) =>
          row.map((key, ci) => {
            if (!key) return <div key={`${ri}-${ci}`} />;
            const isOp = ["÷", "×", "-", "+"].includes(key);
            const isEq = key === "=";
            const isClear = key === "C";
            const isDel = key === "←";
            return (
              <button
                key={`${ri}-${ci}`}
                type="button"
                onClick={() => press(key)}
                className={cn(
                  "flex h-10 w-full items-center justify-center rounded-lg text-sm font-semibold transition-colors select-none",
                  isEq
                    ? "bg-[#1E6B4E] text-white hover:bg-[#185c43]"
                    : isOp
                      ? "bg-[#1E6B4E]/10 text-[#1E6B4E] hover:bg-[#1E6B4E]/20"
                      : isClear
                        ? "bg-red-100 text-red-600 hover:bg-red-200"
                        : isDel
                          ? "bg-gray-200 text-gray-600 hover:bg-gray-300"
                          : "bg-white text-gray-800 border border-gray-200 hover:bg-gray-100",
                )}
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

// ── Helpers ───────────────────────────────────────────────────────
function todayLocal() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Returns the smart default date for a new transaction.
 *  - No activeMonth → today
 *  - activeMonth is current/future → today (don't pre-date into the future)
 *  - activeMonth is a past month → 1st of that month so the user stays in context */
function getInitialDate(activeMonth?: string): string {
  if (!activeMonth) return todayLocal();
  const [yearStr, monthStr] = activeMonth.split("-");
  const year = Number(yearStr);
  const month = Number(monthStr);
  const now = new Date();
  const isCurrentOrFuture =
    year > now.getFullYear() ||
    (year === now.getFullYear() && month >= now.getMonth() + 1);
  if (isCurrentOrFuture) return todayLocal();
  return `${activeMonth}-01`;
}

// ── Main dialog ───────────────────────────────────────────────────
export function TransactionDialog({ categories, transaction, triggerVariant = "primary", activeMonth, onOptimisticAdd, onOptimisticRemove }: Props) {
  const [open, setOpen] = useState(false);
  const [showCalc, setShowCalc] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<string>(
    transaction?.payment_method ?? ""
  );
  const isEdit = !!transaction;

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<TransactionInput>({
    resolver: zodResolver(transactionSchema),
    defaultValues: isEdit
      ? {
          type: transaction.type,
          amount: Number(transaction.amount),
          category_id: transaction.category_id,
          description: transaction.description,
          date: transaction.date,
        }
      : {
          type: "expense",
          amount: undefined,
          category_id: "",
          description: "",
          date: getInitialDate(activeMonth),
        },
  });

  const selectedType = watch("type");

  const filteredCategories = categories.filter(
    (c) => c.type === selectedType || c.type === "both"
  );

  useEffect(() => {
    if (!isEdit) setValue("category_id", "");
  }, [selectedType, isEdit, setValue]);

  useEffect(() => {
    if (open && !isEdit) {
      reset({
        type: "expense",
        amount: undefined,
        category_id: "",
        description: "",
        date: getInitialDate(activeMonth),
      });
      setPaymentMethod("");
      setShowCalc(false);
    }
  }, [open, isEdit, reset, activeMonth]);

  async function onSubmit(data: TransactionInput) {
    const fd = new FormData();
    fd.set("type", data.type);
    fd.set("amount", String(data.amount));
    fd.set("category_id", data.category_id);
    fd.set("description", data.description ?? "");
    fd.set("date", data.date);
    if (paymentMethod) fd.set("payment_method", paymentMethod);

    if (!isEdit) {
      // ── Optimistic path ───────────────────────────────────────────────
      // Close the dialog and confirm immediately. The DB write is async.
      const tempId = `opt-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      onOptimisticAdd?.({
        tempId,
        type: data.type,
        amount: data.amount,
        category_id: data.category_id,
        description: data.description ?? "",
        date: data.date,
        payment_method: paymentMethod || null,
      });
      setOpen(false);
      toast.success("Transaction added");
      // Background write — rollback on failure
      const result = await addTransaction(fd);
      if (result?.error) {
        onOptimisticRemove?.(tempId);
        toast.error(`Couldn't save — ${result.error}`);
      }
      return;
    }

    // ── Edit path (synchronous — confirmation matters before close) ───
    const result = await updateTransaction(transaction!.id, fd);
    if (result?.error) {
      toast.error(result.error);
    } else {
      toast.success("Transaction updated");
      setOpen(false);
    }
  }

  const inputClass =
    "w-full rounded-lg border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1E6B4E]/30 focus:border-[#1E6B4E] transition-colors";

  return (
    <>
      {isEdit ? (
        <button
          onClick={() => setOpen(true)}
          className="flex items-center justify-center rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
          aria-label="Edit transaction"
        >
          <Pencil className="size-4" />
        </button>
      ) : triggerVariant === "secondary" ? (
        <button
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-200"
        >
          <Plus className="size-4" />
          Add Transaction
        </button>
      ) : (
        <button
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-[#1E6B4E] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#185c43] focus:outline-none focus:ring-2 focus:ring-[#1E6B4E]/50"
        >
          <Plus className="size-4" />
          Add Transaction
        </button>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md" onClose={() => setOpen(false)}>
          <DialogHeader>
            <DialogTitle>
              {isEdit ? "Edit Transaction" : "Add Transaction"}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4 pt-1">
            {/* Type toggle */}
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
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Amount (₹)
              </label>
              <div className="relative">
                <input
                  type="text"
                  inputMode="decimal"
                  placeholder="0.00"
                  {...register("amount", {
                    setValueAs: (v) =>
                      v === "" || v == null ? undefined : Number(v),
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
                      : "text-gray-400 hover:bg-gray-200 hover:text-gray-600"
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
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Category
              </label>
              <Controller
                control={control}
                name="category_id"
                render={({ field }) => (
                  <CategoryPicker
                    categories={filteredCategories}
                    value={field.value}
                    onChange={field.onChange}
                    error={errors.category_id?.message}
                    transactionType={selectedType}
                  />
                )}
              />
              {errors.category_id && (
                <p className="mt-1.5 text-xs text-red-600">{errors.category_id.message}</p>
              )}
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Description{" "}
                <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <input
                type="text"
                placeholder="e.g. Lunch, Salary, Netflix"
                {...register("description")}
                className={inputClass}
              />
              {errors.description && (
                <p className="mt-1.5 text-xs text-red-600">{errors.description.message}</p>
              )}
            </div>

            {/* Payment Method */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Payment method{" "}
                <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <div className="flex flex-wrap gap-2">
                {PAYMENT_METHODS.map(({ value, label, icon: Icon }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() =>
                      setPaymentMethod((prev) => (prev === value ? "" : value))
                    }
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors",
                      paymentMethod === value
                        ? "border-[#1E6B4E] bg-[#1E6B4E]/10 text-[#1E6B4E]"
                        : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
                    )}
                  >
                    <Icon className="size-3.5 shrink-0" />
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Date */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-sm font-medium text-gray-700">Date</label>
                <button
                  type="button"
                  onClick={() => setValue("date", todayLocal(), { shouldValidate: true })}
                  className="text-xs font-medium text-[#1E6B4E] hover:text-[#185c43] hover:underline transition-colors"
                >
                  Today
                </button>
              </div>
              <input
                type="date"
                {...register("date")}
                className={inputClass}
              />
              {errors.date && (
                <p className="mt-1.5 text-xs text-red-600">{errors.date.message}</p>
              )}
            </div>

            {/* Actions */}
            <div className="flex justify-between pt-1">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="rounded-lg bg-[#1E6B4E] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#185c43] disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isSubmitting
                  ? isEdit ? "Saving…" : "Adding…"
                  : isEdit ? "Save changes" : "Add transaction"}
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
