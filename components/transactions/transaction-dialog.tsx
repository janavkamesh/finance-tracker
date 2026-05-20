"use client";

import { useState, useEffect, useCallback } from "react";
import { useForm, Controller } from "react-hook-form";
import { CategoryPicker } from "@/components/transactions/category-picker";
import { DatePicker } from "@/components/ui/date-picker";
import { parse, format } from "date-fns";
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
  /** Override the trigger button's className (used by detail panel for full-width edit button) */
  triggerClassName?: string;
  /** Override the trigger button's inline style */
  triggerStyle?: React.CSSProperties;
  /** Override the trigger button's label/children */
  triggerLabel?: React.ReactNode;
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
    <div className="mt-2 rounded-xl p-3 shadow-sm" style={{ border: '1px solid var(--border-default)', background: 'var(--bg-elevated)' }}>
      {/* Display */}
      <div className="mb-2 rounded-lg px-3 py-2 text-right" style={{ border: '1px solid var(--border-default)', background: 'var(--bg-input)' }}>
        <p className="text-xs h-4 tabular-nums truncate" style={{ color: 'var(--text-tertiary)' }}>
          {expr || ""}
        </p>
        <p className="text-lg font-bold tabular-nums" style={{ color: 'var(--text-primary)' }}>
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
export function TransactionDialog({ categories, transaction, triggerVariant = "primary", triggerClassName, triggerStyle, triggerLabel, activeMonth, onOptimisticAdd, onOptimisticRemove }: Props) {
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

    // ── Edit path — optimistic: close + confirm immediately ──────────
    setOpen(false);
    toast.success("Transaction updated");
    updateTransaction(transaction!.id, fd).then((result) => {
      if (result?.error) toast.error(`Update failed — ${result.error}`);
    });
  }

  const inputClass =
    "w-full rounded-lg px-3.5 py-2.5 text-sm focus:outline-none transition-colors [background:var(--bg-input)] [color:var(--text-primary)] [border:1px_solid_var(--border-default)] placeholder:[color:var(--text-tertiary)] hover:[border-color:var(--border-strong)] focus:[border-color:var(--text-brand)] focus:[box-shadow:0_0_0_3px_var(--focus-ring)]";

  return (
    <>
      {isEdit && triggerClassName ? (
        <button
          onClick={() => setOpen(true)}
          className={triggerClassName}
          style={triggerStyle}
          aria-label="Edit transaction"
        >
          {triggerLabel ?? <><Pencil className="size-3.5" />Edit Transaction</>}
        </button>
      ) : isEdit ? (
        <button
          onClick={() => setOpen(true)}
          className="flex items-center justify-center rounded-lg p-2 transition-colors hover:bg-[rgba(0,0,0,0.05)] dark:hover:bg-[rgba(255,255,255,0.06)]"
          style={{ color: 'var(--text-tertiary)' }}
          aria-label="Edit transaction"
        >
          <Pencil className="size-4" />
        </button>
      ) : triggerVariant === "secondary" ? (
        <button
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-colors focus:outline-none"
          style={{
            background: 'var(--cta-secondary-bg)',
            color: 'var(--cta-secondary-text)',
            border: '1px solid var(--cta-secondary-border)',
          }}
          onMouseEnter={e => (e.currentTarget.style.background = 'var(--cta-secondary-hover)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'var(--cta-secondary-bg)')}
        >
          <Plus className="size-4" />
          Add Transaction
        </button>
      ) : (
        <button
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-colors focus:outline-none active:scale-[0.98]"
          style={{ background: 'var(--cta-primary-bg)', color: 'var(--cta-primary-text)' }}
          onMouseEnter={e => (e.currentTarget.style.background = 'var(--cta-primary-hover)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'var(--cta-primary-bg)')}
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
                      className="rounded-lg py-2 text-sm font-medium capitalize transition-colors"
                      style={
                        field.value === t
                          ? t === "expense"
                            ? { background: 'rgba(248,113,113,0.12)', color: 'var(--expense-color)', outline: '1px solid rgba(248,113,113,0.30)' }
                            : { background: 'rgba(52,211,153,0.12)', color: 'var(--income-color)', outline: '1px solid rgba(52,211,153,0.30)' }
                          : { background: 'var(--tag-bg)', color: 'var(--text-secondary)' }
                      }
                    >
                      {t}
                    </button>
                  ))}
                </div>
              )}
            />

            {/* Amount + Calculator */}
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
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
                      ? "bg-[var(--cta-primary-bg)] text-white"
                      : "hover:bg-[rgba(0,0,0,0.06)] dark:hover:bg-[rgba(255,255,255,0.08)]"
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
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
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
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                Description{" "}
                <span className="font-normal" style={{ color: 'var(--text-tertiary)' }}>(optional)</span>
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
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
                Payment method{" "}
                <span className="font-normal" style={{ color: 'var(--text-tertiary)' }}>(optional)</span>
              </label>
              <div className="flex flex-wrap gap-2">
                {PAYMENT_METHODS.map(({ value, label, icon: Icon }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() =>
                      setPaymentMethod((prev) => (prev === value ? "" : value))
                    }
                    className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors"
                    style={
                      paymentMethod === value
                        ? { background: 'var(--cta-primary-bg)', color: 'var(--cta-primary-text)', border: 'none' }
                        : { background: 'var(--tag-bg)', color: 'var(--tag-text)', border: '1px solid var(--tag-border)' }
                    }
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
                <label className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Date</label>
                <button
                  type="button"
                  onClick={() => setValue("date", todayLocal(), { shouldValidate: true })}
                  className="text-xs font-medium hover:underline transition-colors"
                  style={{ color: 'var(--text-brand)' }}
                >
                  Today
                </button>
              </div>
              <Controller
                control={control}
                name="date"
                render={({ field }) => (
                  <DatePicker
                    value={field.value ? parse(field.value, "yyyy-MM-dd", new Date()) : null}
                    onChange={(date) => {
                      field.onChange(date ? format(date, "yyyy-MM-dd") : "");
                    }}
                    className={cn(inputClass, "py-2 text-left")}
                  />
                )}
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
                className="rounded-lg px-4 py-2 text-sm font-medium transition-colors hover:bg-[rgba(0,0,0,0.05)] dark:hover:bg-[rgba(255,255,255,0.06)]"
                style={{ color: 'var(--cta-cancel-text)', border: '1px solid var(--border-default)' }}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="rounded-lg px-4 py-2 text-sm font-semibold transition-colors active:scale-[0.98]"
                style={{ background: 'var(--cta-primary-bg)', color: 'var(--cta-primary-text)' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--cta-primary-hover)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'var(--cta-primary-bg)')}
              >
                {isEdit ? "Save changes" : "Add transaction"}
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
