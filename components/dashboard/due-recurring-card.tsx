"use client";

import { useState } from "react";
import { RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { formatINR } from "@/lib/utils";
import { logDueRecurring } from "@/actions/recurring";

interface DueItem {
  id: string;
  type: "income" | "expense";
  description: string;
  amount: number;
  next_due_date: string;
  frequency: string;
  category_name: string | null;
}

export function DueRecurringCard({ items }: { items: DueItem[] }) {
  const [loading, setLoading] = useState(false);

  if (items.length === 0) return null;

  async function handleLogAll() {
    setLoading(true);
    const result = await logDueRecurring(items.map((i) => i.id));
    setLoading(false);
    if (result?.error) toast.error(result.error);
    else toast.success(`${items.length} transaction${items.length > 1 ? "s" : ""} logged`);
  }

  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 px-5 py-4 mb-6">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <RefreshCw className="size-4 text-amber-600 shrink-0" />
          <p className="text-sm font-semibold text-amber-900">
            {items.length} recurring due
          </p>
        </div>
        <button
          onClick={handleLogAll}
          disabled={loading}
          className="rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-700 disabled:opacity-60 transition-colors"
        >
          {loading ? "Logging…" : "Log all"}
        </button>
      </div>
      <ul className="space-y-1.5">
        {items.map((item) => (
          <li key={item.id} className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 min-w-0">
              <span
                className={`h-1.5 w-1.5 rounded-full shrink-0 ${
                  item.type === "income" ? "bg-green-500" : "bg-red-500"
                }`}
              />
              <span className="text-amber-800 truncate">{item.description}</span>
              {item.category_name && (
                <span className="text-amber-500 shrink-0">{item.category_name}</span>
              )}
            </div>
            <span
              className={`tabular-nums font-medium shrink-0 ml-3 ${
                item.type === "income" ? "text-green-700" : "text-red-700"
              }`}
            >
              {item.type === "income" ? "+" : "-"}{formatINR(item.amount)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
