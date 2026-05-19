"use client";

import { useRef, useState } from "react";
import { Zap } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { quickAddExpense } from "@/actions/quick-add";

interface Category {
  id: string;
  name: string;
  type: "income" | "expense" | "both";
  color?: string | null;
  icon?: string | null;
}

interface Props {
  categories: Category[];
}

export function QuickAddForm({ categories }: Props) {
  const expenseCats = categories.filter(
    (c) => c.type === "expense" || c.type === "both"
  );

  const [amount, setAmount] = useState("");
  const [categoryId, setCategoryId] = useState(expenseCats[0]?.id ?? "");
  const [description, setDescription] = useState("");
  const amountRef = useRef<HTMLInputElement>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!amount.trim() || !categoryId) return;

    // ── Optimistic UI ─────────────────────────────────────────────────────────
    // Snapshot the values before clearing so we can rollback on failure.
    const snap = {
      amount,
      categoryId,
      description,
    };

    // 1. Instantly clear the form so the user can begin the next entry.
    setAmount("");
    setDescription("");
    // Return focus to the amount field — enables rapid back-to-back entry.
    setTimeout(() => amountRef.current?.focus(), 30);

    // 2. Fire the success toast immediately — no waiting for the DB.
    toast.success("Expense logged ✓");

    // 3. Commit to Supabase in the background. No await here — the UI is
    //    already updated. If the insert fails, we rollback and surface the error.
    quickAddExpense({
      amount: snap.amount,
      category_id: snap.categoryId,
      description: snap.description,
    })
      .then((result) => {
        if (result?.error) {
          // Server returned a validation/auth error — rollback.
          setAmount(snap.amount);
          setDescription(snap.description);
          setCategoryId(snap.categoryId);
          toast.error(`Couldn't save: ${result.error}`);
        }
        // Success path: revalidatePath inside quickAddExpense refreshes the list.
      })
      .catch(() => {
        // Network / unexpected error — rollback.
        setAmount(snap.amount);
        setDescription(snap.description);
        setCategoryId(snap.categoryId);
        toast.error("Failed to save. Please try again.");
      });
  }

  if (expenseCats.length === 0) return null;

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-xl border border-gray-100 bg-white px-4 py-3 mb-6"
    >
      <div className="flex flex-col sm:flex-row sm:items-center gap-2.5">
        {/* Label */}
        <div className="flex items-center gap-1.5 shrink-0">
          <Zap className="size-3.5 text-[#1E6B4E]" />
          <span className="text-xs font-semibold text-gray-500 whitespace-nowrap">
            Quick add
          </span>
        </div>

        {/* Fields row */}
        <div className="flex flex-1 flex-col sm:flex-row gap-2">
          {/* Amount */}
          <div className="relative flex items-center shrink-0">
            <span className="absolute left-3 text-sm text-gray-400 pointer-events-none select-none">
              ₹
            </span>
            <input
              ref={amountRef}
              type="number"
              min="1"
              step="any"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0"
              required
              className={cn(
                "h-9 w-full sm:w-28 rounded-lg border bg-gray-50 pl-7 pr-3 text-sm font-semibold text-gray-900",
                "placeholder:text-gray-300 placeholder:font-normal",
                "focus:outline-none focus:ring-2 focus:ring-[#1E6B4E]/30 focus:border-[#1E6B4E]",
                "border-gray-200 transition-colors"
              )}
            />
          </div>

          {/* Category */}
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className={cn(
              "h-9 sm:w-40 rounded-lg border border-gray-200 bg-gray-50 px-3 text-sm text-gray-700",
              "focus:outline-none focus:ring-2 focus:ring-[#1E6B4E]/30 focus:border-[#1E6B4E] transition-colors"
            )}
          >
            {expenseCats.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>

          {/* Description */}
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Note (optional)"
            maxLength={255}
            className={cn(
              "h-9 flex-1 min-w-0 rounded-lg border border-gray-200 bg-gray-50 px-3 text-sm text-gray-900",
              "placeholder:text-gray-400",
              "focus:outline-none focus:ring-2 focus:ring-[#1E6B4E]/30 focus:border-[#1E6B4E] transition-colors"
            )}
          />

          {/* Submit — disabled only while amount is empty (natural guard),
              NOT disabled while awaiting the server. */}
          <button
            type="submit"
            disabled={!amount.trim()}
            className={cn(
              "h-9 shrink-0 rounded-lg bg-[#1E6B4E] px-5 text-sm font-semibold text-white",
              "transition-colors hover:bg-[#165a41] active:scale-[0.98]",
              "disabled:opacity-50 disabled:cursor-not-allowed"
            )}
          >
            Log
          </button>
        </div>
      </div>
    </form>
  );
}
