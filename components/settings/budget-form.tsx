"use client";

import { useState } from "react";
import { toast } from "sonner";
import { formatINR } from "@/lib/utils";
import { updateBudget } from "@/actions/budget";

export function BudgetForm({ current }: { current: number | null }) {
  const [value, setValue] = useState(current ? String(current) : "");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    const fd = new FormData();
    fd.set("monthly_budget", value);
    const result = await updateBudget(fd);
    setSaving(false);
    if (result?.error) {
      toast.error(result.error);
    } else {
      toast.success("Monthly budget saved");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-end gap-3">
      <div className="flex-1 max-w-sm">
        <label
          htmlFor="monthly_budget"
          className="block text-sm font-medium text-gray-700 mb-1.5"
        >
          Monthly spending limit
        </label>
        <div className="relative">
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-gray-400 pointer-events-none">
            ₹
          </span>
          <input
            id="monthly_budget"
            type="number"
            min="0"
            step="100"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="e.g. 50000"
            className="w-full rounded-lg border border-gray-200 bg-gray-50 pl-7 pr-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1E6B4E]/30 focus:border-[#1E6B4E] transition-colors"
          />
        </div>
        {current && (
          <p className="mt-1.5 text-xs text-gray-400">
            Current: {formatINR(current)} / month
          </p>
        )}
      </div>
      <button
        type="submit"
        disabled={saving}
        className="rounded-lg bg-[#1E6B4E] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#185c43] disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
      >
        {saving ? "Saving…" : "Save"}
      </button>
      {value && value !== "0" && (
        <button
          type="button"
          onClick={() => setValue("")}
          className="rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
        >
          Clear
        </button>
      )}
    </form>
  );
}
