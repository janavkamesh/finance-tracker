"use client";

import { useState, useEffect } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { deleteCategory } from "@/actions/categories";
import { getCategoryIcon } from "@/lib/category-icons";
import { CategoryDialog } from "./category-dialog";

type Category = {
  id: string;
  name: string;
  type: "income" | "expense" | "both";
  color: string | null;
  icon: string | null;
  monthly_limit: number | null;
};

const TYPE_LABEL: Record<string, string> = {
  income: "Income",
  expense: "Expense",
  both: "Both",
};

const TYPE_STYLE: Record<string, string> = {
  income: "bg-green-100 text-green-700",
  expense: "bg-red-100 text-red-700",
  both: "bg-[#1E6B4E]/10 text-[#1E6B4E]",
};

function insertAlphabetical(list: Category[], cat: Category): Category[] {
  const lower = cat.name.toLowerCase();
  const idx = list.findIndex((c) => c.name.toLowerCase() > lower);
  return idx === -1 ? [...list, cat] : [...list.slice(0, idx), cat, ...list.slice(idx)];
}

export function CategorySection({
  initialCategories,
}: {
  initialCategories: Category[];
}) {
  const [categories, setCategories] = useState<Category[]>(initialCategories);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  // When Next.js revalidates (server action completes), merge the fresh server list
  // with any still-pending optimistic entries so there's no flash/duplicate.
  useEffect(() => {
    setCategories((prev) => {
      const serverIds = new Set(initialCategories.map((c) => c.id));
      const pending = prev.filter(
        (c) => c.id.startsWith("opt-cat-") && !serverIds.has(c.id),
      );
      let merged = [...initialCategories];
      for (const opt of pending) merged = insertAlphabetical(merged, opt);
      return merged;
    });
  }, [initialCategories]);

  function handleOptimisticAdd(data: {
    tempId: string;
    name: string;
    type: "income" | "expense" | "both";
    color: string | null;
    monthly_limit: number | null;
  }) {
    const newCat: Category = {
      id: data.tempId,
      name: data.name,
      type: data.type,
      color: data.color,
      icon: null,
      monthly_limit: data.monthly_limit,
    };
    setCategories((prev) => insertAlphabetical(prev, newCat));
  }

  function handleDelete(cat: Category) {
    setConfirmingId(null);
    deleteCategory(cat.id).then((result) => {
      if (result?.error) toast.error(result.error);
      else toast.success("Category deleted");
    });
  }

  return (
    <section className="rounded-2xl border border-gray-100 bg-white overflow-hidden">
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-50">
        <div>
          <h2 className="text-sm font-semibold text-gray-900">Custom categories</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Add your own categories for income and expenses.
          </p>
        </div>
        <CategoryDialog onAdd={handleOptimisticAdd} />
      </div>

      {categories.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center px-6">
          <p className="text-sm text-gray-400">No custom categories yet.</p>
          <p className="text-xs text-gray-400 mt-1">
            Add one above to personalise your tracking.
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-gray-50">
          {categories.map((cat) => {
            const CatIcon = getCategoryIcon(cat);
            const isConfirming = confirmingId === cat.id;
            const isOptimistic = cat.id.startsWith("opt-cat-");
            return (
              <li
                key={cat.id}
                className="flex items-center gap-3 px-6 py-3.5 group"
              >
                <div
                  className="flex h-7 w-7 items-center justify-center rounded-lg shrink-0"
                  style={{ backgroundColor: `${cat.color ?? "#9ca3af"}18` }}
                >
                  <CatIcon
                    className="size-4"
                    style={{ color: cat.color ?? "#9ca3af" }}
                  />
                </div>
                <span className="flex-1 text-sm font-medium text-gray-900 truncate">
                  {cat.name}
                </span>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${TYPE_STYLE[cat.type]}`}
                >
                  {TYPE_LABEL[cat.type]}
                </span>

                {/* Action buttons — always visible when confirming, hover-only otherwise */}
                {isOptimistic ? (
                  <div className="h-7 w-[60px] shrink-0" />
                ) : (
                  <div
                    className={`flex items-center gap-0.5 shrink-0 transition-opacity ${
                      isConfirming
                        ? "opacity-100"
                        : "opacity-0 group-hover:opacity-100"
                    }`}
                  >
                    <CategoryDialog category={cat} />
                    {isConfirming ? (
                      <>
                        <button
                          onClick={() => handleDelete(cat)}
                          className="rounded px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50 transition-colors"
                        >
                          Delete
                        </button>
                        <button
                          onClick={() => setConfirmingId(null)}
                          className="rounded px-2 py-1 text-xs font-medium text-gray-500 hover:bg-gray-100 transition-colors"
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => setConfirmingId(cat.id)}
                        className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors"
                        aria-label="Delete category"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
