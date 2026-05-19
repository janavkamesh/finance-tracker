"use client";

import { useState } from "react";
import { Trash2, Tag, X } from "lucide-react";
import { toast } from "sonner";
import { bulkDeleteTransactions, bulkChangeCategory } from "@/actions/transactions";

interface Category {
  id: string;
  name: string;
}

interface BulkActionsBarProps {
  selectedIds: string[];
  categories: Category[];
  onClear: () => void;
}

export function BulkActionsBar({ selectedIds, categories, onClear }: BulkActionsBarProps) {
  const [loading, setLoading] = useState<"delete" | "category" | null>(null);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);

  const count = selectedIds.length;

  async function handleBulkDelete() {
    if (!count) return;
    setLoading("delete");
    const result = await bulkDeleteTransactions(selectedIds);
    setLoading(null);
    if (result?.error) {
      toast.error(result.error);
    } else {
      toast.success(`${count} transaction${count !== 1 ? "s" : ""} deleted`);
      onClear();
    }
  }

  async function handleBulkCategory(categoryId: string) {
    if (!count) return;
    setLoading("category");
    const result = await bulkChangeCategory(selectedIds, categoryId);
    setLoading(null);
    setShowCategoryPicker(false);
    if (result?.error) {
      toast.error(result.error);
    } else {
      toast.success(`Category updated for ${count} transaction${count !== 1 ? "s" : ""}`);
      onClear();
    }
  }

  return (
    <div className="relative flex items-center justify-between gap-3 rounded-xl border border-[#1E6B4E]/30 bg-[#1E6B4E]/5 px-4 py-2.5 mb-4">
      {/* Left: count + clear */}
      <div className="flex items-center gap-2">
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#1E6B4E] text-[11px] font-bold text-white">
          {count}
        </span>
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
          {count === 1 ? "1 selected" : `${count} selected`}
        </span>
        <button
          onClick={onClear}
          className="flex h-5 w-5 items-center justify-center rounded text-gray-400 hover:text-gray-600 transition-colors"
          title="Clear selection"
        >
          <X className="size-3.5" />
        </button>
      </div>

      {/* Right: action buttons */}
      <div className="flex items-center gap-2">
        {/* Change category */}
        <div className="relative">
          <button
            onClick={() => setShowCategoryPicker((p) => !p)}
            disabled={loading !== null}
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-700"
          >
            <Tag className="size-3.5" />
            Change category
          </button>

          {showCategoryPicker && (
            <div className="absolute right-0 top-full mt-1.5 z-50 w-52 rounded-xl border border-gray-100 bg-white shadow-lg dark:bg-gray-900 dark:border-gray-700 overflow-hidden">
              <div className="px-3 py-2 border-b border-gray-50 dark:border-gray-800">
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Select category</p>
              </div>
              <ul className="max-h-52 overflow-y-auto py-1">
                {categories.map((cat) => (
                  <li key={cat.id}>
                    <button
                      onClick={() => handleBulkCategory(cat.id)}
                      disabled={loading === "category"}
                      className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-gray-800 transition-colors disabled:opacity-50"
                    >
                      {cat.name}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Delete */}
        <button
          onClick={handleBulkDelete}
          disabled={loading !== null}
          className="inline-flex items-center gap-1.5 rounded-lg bg-red-50 border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-100 transition-colors disabled:opacity-50"
        >
          <Trash2 className="size-3.5" />
          {loading === "delete" ? "Deleting…" : "Delete selected"}
        </button>
      </div>
    </div>
  );
}
