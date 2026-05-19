"use client";

import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { TransactionFilters } from "./transaction-filters";
import { TransactionDialog } from "./transaction-dialog";
import { DeleteTransactionButton } from "./delete-transaction-button";
import { BulkActionsBar } from "./bulk-actions-bar";
import { getCategoryIcon } from "@/lib/category-icons";
import { formatINR, cn } from "@/lib/utils";
import { fetchTransactionsBatch } from "@/app/actions/transactions";

interface TxnRow {
  id: string;
  type: "income" | "expense";
  amount: number;
  date: string;
  description: string;
  category_id: string;
  payment_method?: string | null;
  category_name?: string | null;
  category_color?: string | null;
  category_icon?: string | null;
  category_user_id?: string | null;
}

interface CategoryItem {
  id: string;
  name: string;
  type: "income" | "expense" | "both";
  color: string | null;
  icon?: string | null;
  user_id?: string | null;
}

interface Props {
  initialTransactions: TxnRow[];
  categories: CategoryItem[];
  activeMonth?: string;
  filters?: {
    search: string;
    typeFilter: string;
    categoryFilter: string;
    period: string;
  };
}

function getGroupLabel(dateString: string) {
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, "0")}-${String(yesterday.getDate()).padStart(2, "0")}`;
  if (dateString === todayStr) return "Today";
  if (dateString === yesterdayStr) return "Yesterday";
  return new Date(dateString + "T00:00:00").toLocaleDateString("en-IN", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

const TYPE_TABS = [
  { value: "all",     label: "All" },
  { value: "income",  label: "Income" },
  { value: "expense", label: "Expense" },
] as const;

export function TransactionManager({ initialTransactions, categories, activeMonth, filters }: Props) {
  // ── Selection state ───────────────────────────────────────────────
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // ── Type tab — client-side, zero latency ──────────────────────────
  const [typeTab, setTypeTab] = useState<"all" | "income" | "expense">("all");

  // ── Infinite scroll state ─────────────────────────────────────────
  const [transactions, setTransactions] = useState<TxnRow[]>(initialTransactions);
  const [hasMore, setHasMore] = useState(initialTransactions.length === 20);
  const [isFetching, setIsFetching] = useState(false);
  const [offset, setOffset] = useState(20);

  // Sync when server-side filters change (search / period / category)
  useEffect(() => {
    setTransactions(initialTransactions);
    setOffset(20);
    setHasMore(initialTransactions.length === 20);
    setSelectedIds(new Set());
    // Keep typeTab so switching period doesn't reset the user's tab choice
  }, [initialTransactions]);

  // ── Infinite scroll observer ──────────────────────────────────────
  const loadMoreRef = useRef<HTMLDivElement>(null);

  const loadMore = useCallback(async () => {
    if (isFetching || !hasMore || !filters) return;
    setIsFetching(true);
    try {
      const newBatch = await fetchTransactionsBatch({ ...filters, offset, limit: 20 });
      if (newBatch.length > 0) {
        setTransactions((prev) => {
          const existingIds = new Set(prev.map((t) => t.id));
          return [...prev, ...newBatch.filter((t) => !existingIds.has(t.id))];
        });
        setOffset((prev) => prev + newBatch.length);
      }
      if (newBatch.length < 20) setHasMore(false);
    } catch (e) {
      console.error("Error fetching transactions batch:", e);
    } finally {
      setIsFetching(false);
    }
  }, [isFetching, hasMore, filters, offset]);

  useEffect(() => {
    if (!hasMore) return;
    const observer = new IntersectionObserver(
      (entries) => { if (entries[0].isIntersecting) loadMore(); },
      { rootMargin: "200px" }
    );
    if (loadMoreRef.current) observer.observe(loadMoreRef.current);
    return () => observer.disconnect();
  }, [hasMore, loadMore]);

  // ── Optimistic add / remove ───────────────────────────────────────
  const addOptimistic = useCallback((data: {
    tempId: string;
    type: "income" | "expense";
    amount: number;
    category_id: string;
    description: string;
    date: string;
    payment_method?: string | null;
  }) => {
    const cat = categories.find((c) => c.id === data.category_id);
    const newTxn: TxnRow = {
      id: data.tempId,
      type: data.type,
      amount: data.amount,
      date: data.date,
      description: data.description,
      category_id: data.category_id,
      payment_method: data.payment_method,
      category_name: cat?.name ?? null,
      category_color: cat?.color ?? null,
      category_icon: cat?.icon ?? null,
      category_user_id: cat?.user_id ?? null,
    };
    // Prepend to list and sort by date descending so it lands in the right group
    setTransactions((prev) => [newTxn, ...prev]);
    // Auto-switch tab so the new item is immediately visible
    setTypeTab("all");
  }, [categories]);

  const removeOptimistic = useCallback((tempId: string) => {
    setTransactions((prev) => prev.filter((t) => t.id !== tempId));
  }, []);

  // ── Live URL params drive instant client-side narrowing ───────────
  // While the server re-fetches in the background (via useTransition in the
  // filters component), we apply the new category / period / search filters
  // to the currently-loaded set so the list updates in 0 ms instead of
  // waiting on the network round-trip.
  const searchParams = useSearchParams();
  const liveCategory = searchParams.get("category") ?? "";
  const livePeriod   = searchParams.get("period") ?? "this_month";
  const liveSearch   = (searchParams.get("search") ?? "").trim().toLowerCase();

  // Period → inclusive date range, evaluated on the client for instant filtering.
  const periodRange = useMemo<{ start?: string; end?: string }>(() => {
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    const fmt = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    if (livePeriod === "this_month") {
      return {
        start: `${now.getFullYear()}-${pad(now.getMonth() + 1)}-01`,
        end: fmt(new Date(now.getFullYear(), now.getMonth() + 1, 0)),
      };
    }
    if (livePeriod === "last_month") {
      return {
        start: fmt(new Date(now.getFullYear(), now.getMonth() - 1, 1)),
        end: fmt(new Date(now.getFullYear(), now.getMonth(), 0)),
      };
    }
    if (livePeriod === "3_months") {
      return { start: fmt(new Date(now.getFullYear(), now.getMonth() - 2, 1)) };
    }
    return {}; // all time
  }, [livePeriod]);

  // Client-side narrowing applied on top of the already-loaded transactions.
  // Optimistic rows (pending writes) bypass these filters so they don't
  // disappear mid-save.
  const clientFiltered = useMemo(() => {
    return transactions.filter((t) => {
      if (t.id.startsWith("opt-")) return true;
      if (liveCategory && t.category_id !== liveCategory) return false;
      if (periodRange.start && t.date < periodRange.start) return false;
      if (periodRange.end && t.date > periodRange.end) return false;
      if (liveSearch && !(t.description ?? "").toLowerCase().includes(liveSearch)) return false;
      return true;
    });
  }, [transactions, liveCategory, periodRange, liveSearch]);

  // ── Client-side type filtering (instant, 0 ms) ────────────────────
  const displayedTransactions = useMemo(
    () => typeTab === "all" ? clientFiltered : clientFiltered.filter((t) => t.type === typeTab),
    [clientFiltered, typeTab]
  );

  // Tab counts (computed from the client-filtered set so they reflect the
  // current category/period/search context)
  const incomeCount  = useMemo(() => clientFiltered.filter((t) => t.type === "income").length,  [clientFiltered]);
  const expenseCount = useMemo(() => clientFiltered.filter((t) => t.type === "expense").length, [clientFiltered]);

  // ── Bulk selection ────────────────────────────────────────────────
  const allSelected  = displayedTransactions.length > 0 && selectedIds.size === displayedTransactions.length;
  const someSelected = selectedIds.size > 0;

  function toggleAll() {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(displayedTransactions.map((t) => t.id)));
    }
  }

  function toggleOne(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleTypeTab(tab: "all" | "income" | "expense") {
    setTypeTab(tab);
    setSelectedIds(new Set()); // clear selection when switching tabs
  }

  const clearSelection = useCallback(() => setSelectedIds(new Set()), []);
  const filterCats    = categories.map((c) => ({ id: c.id, name: c.name }));
  const selectedArray = Array.from(selectedIds);

  // ── Group displayed transactions by date ──────────────────────────
  const groupedTransactions = useMemo(() => {
    const groups: Record<string, TxnRow[]> = {};
    displayedTransactions.forEach((txn) => {
      const label = getGroupLabel(txn.date);
      if (!groups[label]) groups[label] = [];
      groups[label].push(txn);
    });
    return groups;
  }, [displayedTransactions]);

  // ── Render ────────────────────────────────────────────────────────
  return (
    <>
      {/* ── Top bar: bulk toolbar OR filters + type tabs ───────────── */}
      {someSelected ? (
        <BulkActionsBar
          selectedIds={selectedArray}
          categories={filterCats}
          onClear={clearSelection}
        />
      ) : (
        <div className="mb-4 space-y-3">
          {/* Row 1: Type tabs (instant) + Add Transaction button */}
          <div className="flex items-center justify-between gap-3">
            {/* Type tabs — pure local state, zero network request */}
            <div className="flex h-9 rounded-lg border border-gray-200 bg-white overflow-hidden text-sm font-medium shrink-0">
              {TYPE_TABS.map(({ value, label }) => {
                const count = value === "income" ? incomeCount : value === "expense" ? expenseCount : transactions.length;
                return (
                  <button
                    key={value}
                    onClick={() => handleTypeTab(value)}
                    className={cn(
                      "px-3 transition-colors flex items-center gap-1.5",
                      typeTab === value
                        ? value === "income"
                          ? "bg-green-100 text-green-700"
                          : value === "expense"
                            ? "bg-red-100 text-red-700"
                            : "bg-[#1E6B4E]/10 text-[#1E6B4E]"
                        : "text-gray-500 hover:bg-gray-50"
                    )}
                  >
                    {label}
                    {value !== "all" && (
                      <span className={cn(
                        "text-[10px] font-bold rounded-full px-1.5 py-0.5 tabular-nums leading-none",
                        typeTab === value
                          ? value === "income"
                            ? "bg-green-200/70 text-green-800"
                            : "bg-red-200/70 text-red-800"
                          : "bg-gray-100 text-gray-400"
                      )}>
                        {count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Add Transaction — optimistic, instant UI update */}
            <TransactionDialog
              categories={categories}
              activeMonth={activeMonth}
              onOptimisticAdd={addOptimistic}
              onOptimisticRemove={removeOptimistic}
            />
          </div>

          {/* Row 2: Search / period / category / export filters */}
          <TransactionFilters categories={filterCats} showExportMenu />
        </div>
      )}

      {/* ── Empty state for current tab ────────────────────────────── */}
      {displayedTransactions.length === 0 && transactions.length > 0 && (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-white py-12 text-center px-6">
          <p className="text-sm font-medium text-gray-700">
            No {typeTab} transactions in this period
          </p>
          <p className="text-xs text-gray-400 mt-1">
            Switch to &quot;All&quot; to see all transactions, or add one now.
          </p>
        </div>
      )}

      {/* ── Transaction list ───────────────────────────────────────── */}
      {displayedTransactions.length > 0 && (
        <div className="rounded-2xl border border-gray-100 bg-white overflow-hidden relative">
          {/* Select-all header */}
          <div className="flex items-center gap-3 px-4 py-2.5 border-b border-gray-50 bg-gray-50/40 sticky top-0 z-10">
            <input
              type="checkbox"
              checked={allSelected}
              onChange={toggleAll}
              className="h-4 w-4 rounded border-gray-300 accent-[#1E6B4E] cursor-pointer"
              aria-label="Select all transactions"
            />
            <span className="text-xs text-gray-400 font-medium">
              {someSelected
                ? `${selectedIds.size} of ${displayedTransactions.length} selected`
                : "Select all"}
            </span>
          </div>

          <div className="divide-y divide-gray-50">
            {Object.entries(groupedTransactions).map(([dateLabel, txns]) => (
              <div key={dateLabel}>
                {/* Date group sub-header */}
                <div className="px-4 py-2 bg-gray-50/80 border-y border-gray-100 first:border-t-0 sticky top-10 z-10 backdrop-blur-sm">
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    {dateLabel}
                  </h3>
                </div>

                <ul className="divide-y divide-gray-50">
                  {txns.map((txn) => {
                    const isIncome  = txn.type === "income";
                    const isSelected = selectedIds.has(txn.id);
                    const isOptimistic = txn.id.startsWith("opt-");
                    const Icon = txn.category_name
                      ? getCategoryIcon({ name: txn.category_name, icon: txn.category_icon ?? undefined })
                      : null;

                    return (
                      <li
                        key={txn.id}
                        className={cn(
                          "flex items-center gap-2.5 px-4 py-3 transition-colors group",
                          isSelected   ? "bg-[#1E6B4E]/5"  : "hover:bg-gray-50/60",
                          isOptimistic ? "opacity-70"       : ""
                        )}
                      >
                        {/* Checkbox */}
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleOne(txn.id)}
                          disabled={isOptimistic}
                          className="h-4 w-4 rounded border-gray-300 accent-[#1E6B4E] cursor-pointer shrink-0"
                          aria-label={`Select ${txn.description || txn.category_name || "transaction"}`}
                        />

                        <div className={cn(
                          "h-2 w-2 shrink-0 rounded-full",
                          isIncome ? "bg-green-500" : "bg-red-500"
                        )} />

                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {txn.description || txn.category_name || "—"}
                            {isOptimistic && (
                              <span className="ml-1.5 text-[10px] text-gray-400 font-normal">saving…</span>
                            )}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5">
                            {txn.category_name && (
                              <span
                                className={cn(
                                  "inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs font-medium",
                                  (!txn.category_user_id || !txn.category_color) &&
                                    "bg-gray-100 text-gray-700"
                                )}
                                style={
                                  txn.category_user_id && txn.category_color
                                    ? {
                                        backgroundColor: `${txn.category_color}18`,
                                        color: txn.category_color,
                                      }
                                    : undefined
                                }
                              >
                                {Icon && <Icon className="size-3 shrink-0" />}
                                {txn.category_name}
                              </span>
                            )}
                            <span className="text-xs text-gray-400">
                              {new Date(txn.date + "T00:00:00").toLocaleDateString("en-IN", {
                                day: "numeric", month: "short", year: "numeric",
                              })}
                            </span>
                          </div>
                        </div>

                        <span className={cn(
                          "text-sm font-semibold tabular-nums shrink-0",
                          isIncome ? "text-green-600" : "text-red-600"
                        )}>
                          {isIncome ? "+" : "-"}{formatINR(txn.amount)}
                        </span>

                        {/* Edit / Delete — hidden for optimistic rows */}
                        {!isOptimistic && (
                          <div className="flex items-center gap-0.5">
                            <TransactionDialog
                              categories={categories}
                              transaction={{
                                id: txn.id,
                                type: txn.type,
                                amount: txn.amount,
                                category_id: txn.category_id,
                                description: txn.description,
                                date: txn.date,
                              }}
                            />
                            <DeleteTransactionButton id={txn.id} />
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>

          {/* Infinite scroll sentinel + skeleton */}
          <div ref={loadMoreRef} className="w-full">
            {isFetching && (
              <div className="px-4 py-4 animate-pulse border-t border-gray-50 flex items-center gap-3">
                <div className="h-4 w-4 bg-gray-200 rounded shrink-0" />
                <div className="h-2 w-2 bg-gray-200 rounded-full shrink-0" />
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 rounded w-1/3 mb-2" />
                  <div className="h-3 bg-gray-100 rounded w-1/4" />
                </div>
                <div className="h-4 bg-gray-200 rounded w-16 shrink-0" />
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
