"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type React from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Download, MoreVertical, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { CustomSelect, type SelectOption } from "@/components/ui/custom-select";
import { getCategoryIcon } from "@/lib/category-icons";
import { ExportDialog } from "@/components/transactions/export-dialog";

interface Category {
  id: string;
  name: string;
  color?: string | null;
  icon?: string | null;
}

const PERIODS: SelectOption[] = [
  { label: "This month", value: "this_month" },
  { label: "Last month", value: "last_month" },
  { label: "Last 3 months", value: "3_months" },
  { label: "All time", value: "all" },
];

export function TransactionFilters({
  categories,
  showExportMenu = false,
}: {
  categories: Category[];
  showExportMenu?: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const currentSearch = params.get("search") ?? "";
  const currentType = params.get("type") ?? "all";
  const currentPeriod = params.get("period") ?? "this_month";
  const currentCategory = params.get("category") ?? "all";

  const [searchValue, setSearchValue] = useState(currentSearch);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close kebab menu on outside click
  useEffect(() => {
    if (!menuOpen) return;
    function handleOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [menuOpen]);

  // Prefetch income/expense filter variants so first-click is instant
  useEffect(() => {
    router.prefetch(`${pathname}?type=income`);
    router.prefetch(`${pathname}?type=expense`);
  }, [router, pathname]);

  const updateParam = useCallback(
    (key: string, value: string) => {
      const next = new URLSearchParams(params.toString());
      if (value && value !== "all" && value !== "this_month") {
        next.set(key, value);
      } else if (key === "period" && value === "this_month") {
        next.delete(key);
      } else if (value === "all") {
        next.delete(key);
      } else {
        next.set(key, value);
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

  const categoryOptions: SelectOption[] = [
    { label: "All categories", value: "all" },
    ...categories.map((c) => {
      const Icon = getCategoryIcon(c);
      return {
        label: c.name,
        value: c.id,
        icon: <Icon className="size-3.5" style={{ color: c.color ?? "#6b7280" }} />,
      };
    }),
  ];

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
      <CustomSelect
        options={PERIODS}
        value={currentPeriod}
        onChange={(v) => updateParam("period", v)}
        className="w-full sm:w-36"
      />

      {/* Category */}
      {categories.length > 0 && (
        <CustomSelect
          options={categoryOptions}
          value={currentCategory}
          onChange={(v) => updateParam("category", v)}
          className="w-full sm:w-40"
        />
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

      {/* Kebab actions menu */}
      {showExportMenu && (
        <>
          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={() => setMenuOpen((s) => !s)}
              className={cn(
                "flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-500 transition-colors hover:bg-gray-50 hover:text-gray-700",
                menuOpen && "bg-gray-50 text-gray-700 border-gray-300"
              )}
              aria-label="More actions"
            >
              <MoreVertical className="size-4" />
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-10 z-20 min-w-[160px] rounded-xl border border-gray-200 bg-white shadow-lg py-1">
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    setExportOpen(true);
                  }}
                  className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <Download className="size-3.5 text-gray-500 shrink-0" />
                  Export CSV
                </button>
              </div>
            )}
          </div>
          <ExportDialog open={exportOpen} onOpenChange={setExportOpen} />
        </>
      )}
    </div>
  );
}
