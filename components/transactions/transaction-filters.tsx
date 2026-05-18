"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Search, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface Category {
  id: string;
  name: string;
}

const PERIODS = [
  { label: "This month", value: "this_month" },
  { label: "Last month", value: "last_month" },
  { label: "Last 3 months", value: "3_months" },
  { label: "All time", value: "all" },
] as const;

export function TransactionFilters({ categories }: { categories: Category[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const currentSearch = params.get("search") ?? "";
  const currentType = params.get("type") ?? "all";
  const currentPeriod = params.get("period") ?? "this_month";
  const currentCategory = params.get("category") ?? "all";

  const [searchValue, setSearchValue] = useState(currentSearch);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const updateParam = useCallback(
    (key: string, value: string) => {
      const next = new URLSearchParams(params.toString());
      if (value && value !== "all") {
        next.set(key, value);
      } else {
        next.delete(key);
      }
      router.replace(`${pathname}?${next.toString()}`);
    },
    [params, pathname, router],
  );

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      updateParam("search", searchValue.trim());
    }, 350);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchValue, updateParam]);

  const hasActiveFilters =
    currentSearch ||
    currentType !== "all" ||
    currentPeriod !== "this_month" ||
    currentCategory !== "all";

  function clearAll() {
    setSearchValue("");
    router.replace(pathname);
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:flex-wrap">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-gray-400 pointer-events-none" />
        <input
          type="text"
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
          placeholder="Search description…"
          className="h-9 w-full sm:w-52 rounded-lg border border-gray-200 bg-white pl-8 pr-3 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1E6B4E]/30 focus:border-[#1E6B4E] transition-colors"
        />
      </div>

      {/* Type toggle */}
      <div className="flex h-9 rounded-lg border border-gray-200 bg-white overflow-hidden text-sm font-medium">
        {(["all", "income", "expense"] as const).map((t) => (
          <button
            key={t}
            onClick={() => updateParam("type", t)}
            className={cn(
              "px-3 transition-colors capitalize",
              currentType === t
                ? t === "income"
                  ? "bg-green-100 text-green-700"
                  : t === "expense"
                    ? "bg-red-100 text-red-700"
                    : "bg-[#1E6B4E]/10 text-[#1E6B4E]"
                : "text-gray-500 hover:bg-gray-50",
            )}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Period */}
      <select
        value={currentPeriod}
        onChange={(e) => updateParam("period", e.target.value)}
        className="h-9 rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#1E6B4E]/30 focus:border-[#1E6B4E] transition-colors"
      >
        {PERIODS.map((p) => (
          <option key={p.value} value={p.value}>
            {p.label}
          </option>
        ))}
      </select>

      {/* Category */}
      {categories.length > 0 && (
        <select
          value={currentCategory}
          onChange={(e) => updateParam("category", e.target.value)}
          className="h-9 rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#1E6B4E]/30 focus:border-[#1E6B4E] transition-colors"
        >
          <option value="all">All categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      )}

      {/* Clear */}
      {hasActiveFilters && (
        <button
          onClick={clearAll}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors"
        >
          <X className="size-3.5" />
          Clear
        </button>
      )}
    </div>
  );
}
