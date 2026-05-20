"use client";

import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { List, CalendarDays, CheckSquare, X } from "lucide-react";
import { TransactionFilters } from "./transaction-filters";
import { TransactionDialog } from "./transaction-dialog";
import { DeleteTransactionButton } from "./delete-transaction-button";
import { BulkActionsBar } from "./bulk-actions-bar";
import { TransactionCalendar } from "./transaction-calendar";
import { getCategoryIcon } from "@/lib/category-icons";
import { formatINR, cn } from "@/lib/utils";
import { fetchTransactionsBatch } from "@/app/actions/transactions";

const PAYMENT_LABELS: Record<string, string> = {
  cash: "Cash",
  upi: "UPI",
  card: "Card",
  net_banking: "Net Banking",
  wallet: "Wallet",
};

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
  emptyMessage?: string;
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

export function TransactionManager({ initialTransactions, categories, activeMonth, emptyMessage, filters }: Props) {
  // ── Selection state ───────────────────────────────────────────────
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectionMode, setSelectionMode] = useState(false);

  // ── View toggle (List / Calendar) — UI only for now ───────────────
  const [viewMode, setViewMode] = useState<"list" | "calendar">("list");

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
      if (liveSearch) {
        const inDesc = (t.description ?? "").toLowerCase().includes(liveSearch);
        const inCat  = (t.category_name ?? "").toLowerCase().includes(liveSearch);
        if (!inDesc && !inCat) return false;
      }
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

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
    setSelectionMode(false);
  }, []);
  const filterCats    = categories.map((c) => ({ id: c.id, name: c.name }));
  const selectedArray = Array.from(selectedIds);

  // ── Group displayed transactions by date ──────────────────────────
  const groupedTransactions = useMemo(() => {
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

    // Today/past: newest first. Future: soonest first, pushed below everything.
    const sorted = [...displayedTransactions].sort((a, b) => {
      const aFuture = a.date > todayStr;
      const bFuture = b.date > todayStr;
      if (aFuture !== bFuture) return aFuture ? 1 : -1;
      if (aFuture) return a.date.localeCompare(b.date);
      return b.date.localeCompare(a.date);
    });

    const groups: Record<string, TxnRow[]> = {};
    sorted.forEach((txn) => {
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
          {/* Row 1: Type tabs + filters + Add Transaction (all on one line, wraps gracefully) */}
          <div className="flex flex-wrap items-center gap-4">
            {/* Left group: tabs + inline filters — grows to fill available space */}
            <div className="flex items-center flex-wrap gap-3 flex-1 min-w-0">
              {/* Type tabs — pure local state, zero network request */}
              <div
                className="flex h-9 rounded-lg overflow-hidden text-sm font-medium shrink-0"
                style={{ border: '1px solid var(--border-default)', background: 'var(--bg-elevated)' }}
              >
                {TYPE_TABS.map(({ value, label }) => {
                  const count = value === "income" ? incomeCount : value === "expense" ? expenseCount : transactions.length;
                  const isActive = typeTab === value;
                  const activeStyle = isActive
                    ? value === "income"
                      ? { background: 'rgba(52,211,153,0.12)', color: 'var(--income-color)' }
                      : value === "expense"
                        ? { background: 'rgba(248,113,113,0.12)', color: 'var(--expense-color)' }
                        : { background: 'var(--bg-active-nav)', color: 'var(--text-brand)' }
                    : { color: 'var(--text-secondary)' };
                  return (
                    <button
                      key={value}
                      onClick={() => handleTypeTab(value)}
                      className="px-3 transition-colors flex items-center gap-1.5 hover:bg-[rgba(0,0,0,0.03)] dark:hover:bg-[rgba(255,255,255,0.03)]"
                      style={activeStyle}
                    >
                      {label}
                      {value !== "all" && (
                        <span
                          className="text-[10px] font-bold rounded-full px-1.5 py-0.5 tabular-nums leading-none"
                          style={
                            isActive
                              ? value === "income"
                                ? { background: 'rgba(52,211,153,0.20)', color: 'var(--income-color)' }
                                : { background: 'rgba(248,113,113,0.20)', color: 'var(--expense-color)' }
                              : { background: 'var(--tag-bg)', color: 'var(--text-tertiary)' }
                          }
                        >
                          {count}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Search / period / category / export — rendered inline via display:contents */}
              <TransactionFilters categories={filterCats} showExportMenu wrapperClassName="contents" />
            </div>

            {/* Add Transaction — pinned to the far right, never wraps early */}
            <div className="shrink-0 ml-auto">
              <TransactionDialog
                categories={categories}
                activeMonth={activeMonth}
                onOptimisticAdd={addOptimistic}
                onOptimisticRemove={removeOptimistic}
              />
            </div>
          </div>

          {/* Row 2: Select toggle (left) + View toggle (right) */}
          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => setSelectionMode((s) => !s)}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg px-3.5 text-sm font-semibold shadow-sm transition-all focus:outline-none"
              style={
                selectionMode
                  ? { background: 'var(--bg-active-nav)', color: 'var(--text-brand)', border: '1px solid var(--border-brand)' }
                  : { background: 'var(--cta-secondary-bg)', color: 'var(--cta-secondary-text)', border: '1px solid var(--cta-secondary-border)' }
              }
              aria-pressed={selectionMode}
            >
              {selectionMode ? <X className="size-3.5" /> : <CheckSquare className="size-3.5" />}
              {selectionMode ? "Cancel" : "Select"}
            </button>

            <div
              className="inline-flex h-9 items-center rounded-lg p-0.5 shadow-sm"
              style={{ border: '1px solid var(--border-default)', background: 'var(--bg-elevated)' }}
              role="tablist"
              aria-label="Switch view"
            >
              <button
                type="button"
                role="tab"
                aria-selected={viewMode === "list"}
                onClick={() => setViewMode("list")}
                className="inline-flex h-8 items-center gap-1.5 rounded-md px-3 text-xs font-semibold transition-colors"
                style={
                  viewMode === "list"
                    ? { background: 'var(--bg-active-nav)', color: 'var(--text-brand)' }
                    : { color: 'var(--text-secondary)' }
                }
              >
                <List className="size-3.5" />
                List
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={viewMode === "calendar"}
                onClick={() => setViewMode("calendar")}
                className="inline-flex h-8 items-center gap-1.5 rounded-md px-3 text-xs font-semibold transition-colors"
                style={
                  viewMode === "calendar"
                    ? { background: 'var(--bg-active-nav)', color: 'var(--text-brand)' }
                    : { color: 'var(--text-secondary)' }
                }
              >
                <CalendarDays className="size-3.5" />
                Calendar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Interactive calendar view ───────────────────────────────── */}
      {viewMode === "calendar" && (
        <TransactionCalendar inline />
      )}

      {/* ── Empty state ────────────────────────────────────────────── */}
      {displayedTransactions.length === 0 && (
        <div
          key={`empty-${liveSearch}`}
          className="flex flex-col items-center justify-center rounded-2xl border border-dashed py-16 text-center px-6 animate-in fade-in duration-200"
          style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border-default)' }}
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-full mb-4" style={{ background: 'var(--tag-bg)' }}>
            <svg className="h-6 w-6" style={{ color: 'var(--text-tertiary)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 14.25l6-6m4.5-3.493V21.75l-3.75-1.5-3.75 1.5-3.75-1.5-3.75 1.5V4.757c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0c1.1.128 1.907 1.077 1.907 2.185z" />
            </svg>
          </div>
          {transactions.length > 0 ? (
            <>
              <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                No {typeTab} transactions in this period
              </p>
              <p className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>
                Switch to &quot;All&quot; to see all transactions, or add one now.
              </p>
            </>
          ) : (liveSearch || liveCategory) ? (
            <>
              <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                {emptyMessage ?? "No transactions match your current filters."}
              </p>
              <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>Try adjusting or clearing the filters above.</p>
            </>
          ) : (
            <>
              <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Nothing here yet</p>
              <p className="text-sm mt-1 mb-5" style={{ color: 'var(--text-secondary)' }}>
                Track your first income or expense to see it here.
              </p>
              <TransactionDialog categories={categories} activeMonth={activeMonth} />
            </>
          )}
        </div>
      )}

      {/* ── Transaction list ───────────────────────────────────────── */}
      {viewMode === "list" && displayedTransactions.length > 0 && (
        <div
          className="w-full rounded-2xl overflow-hidden relative"
          style={{
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border-default)',
            boxShadow: 'var(--card-shadow)',
          }}
        >
          {/* List header — always shows the title; checkbox row only in selection mode */}
          <div
            className="flex items-center justify-between gap-3 px-5 py-3.5 sticky top-0 z-10"
            style={{
              background: 'var(--bg-elevated)',
              borderBottom: '1px solid var(--border-default)',
            }}
          >
            <div className="flex items-center gap-3 min-w-0">
              {selectionMode && (
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleAll}
                  className="h-4 w-4 rounded border-gray-300 accent-[#1E6B4E] cursor-pointer"
                  aria-label="Select all transactions"
                />
              )}
              <h2 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>All Transactions</h2>
              <span className="text-xs tabular-nums" style={{ color: 'var(--text-tertiary)' }}>
                {selectionMode && someSelected
                  ? `${selectedIds.size} of ${displayedTransactions.length} selected`
                  : `${displayedTransactions.length} ${displayedTransactions.length === 1 ? "item" : "items"}`}
              </span>
            </div>
          </div>

          <div
            key={liveSearch}
            className="divide-y animate-in fade-in duration-200"
            style={{ borderColor: 'var(--border-default)' }}
          >
            {Object.entries(groupedTransactions).map(([dateLabel, txns]) => (
              <div key={dateLabel}>
                {/* Date group sub-header */}
                <div
                  className="px-4 py-1.5 sticky top-10 z-10"
                  style={{
                    background: 'var(--bg-elevated)',
                    borderBottom: '1px solid var(--border-default)',
                  }}
                >
                  <h3
                    className="text-xs font-semibold uppercase tracking-wider"
                    style={{ color: 'var(--text-tertiary)' }}
                  >
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

                    const paymentLabel = txn.payment_method
                      ? PAYMENT_LABELS[txn.payment_method] ?? null
                      : null;

                    return (
                      <li
                        key={txn.id}
                        className={cn(
                          "flex items-center gap-3 px-5 py-3 transition-colors group",
                          isSelected
                            ? "bg-[rgba(22,101,52,0.08)] dark:bg-[rgba(0,185,107,0.10)]"
                            : "hover:bg-[rgba(22,101,52,0.05)] dark:hover:bg-[rgba(0,185,107,0.06)]",
                          isOptimistic ? "opacity-70" : ""
                        )}
                      >
                        {/* Checkbox — only when in selection mode */}
                        {selectionMode && (
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleOne(txn.id)}
                            disabled={isOptimistic}
                            className="h-4 w-4 rounded border-gray-300 accent-[#1E6B4E] cursor-pointer shrink-0"
                            aria-label={`Select ${txn.description || txn.category_name || "transaction"}`}
                          />
                        )}

                        {/* Strict 4-column grid — Col widths: 50% | 15% | 20% | 15% */}
                        <div
                          className="grid flex-1 min-w-0 items-center gap-x-3"
                          style={{ gridTemplateColumns: "2fr 0.6fr 0.8fr 0.6fr" }}
                        >
                          {/* Col 1 — Context (50%): icon + description + date + category pill */}
                          <div className="flex items-center gap-3 min-w-0">
                            <div
                              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
                              style={
                                txn.category_user_id && txn.category_color
                                  ? { backgroundColor: `${txn.category_color}1f`, color: txn.category_color }
                                  : { background: 'var(--tag-bg)', color: 'var(--text-secondary)' }
                              }
                            >
                              {Icon ? (
                                <Icon className="size-4" />
                              ) : (
                                <span className={cn(
                                  "h-2 w-2 rounded-full",
                                  isIncome ? "bg-green-500" : "bg-red-500"
                                )} />
                              )}
                            </div>

                            <div className="min-w-0">
                              <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                                {txn.description || txn.category_name || "—"}
                                {isOptimistic && (
                                  <span className="ml-1.5 text-[10px] text-gray-400 font-normal">saving…</span>
                                )}
                              </p>
                              <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                                <span className="text-xs shrink-0 tabular-nums" style={{ color: 'var(--text-tertiary)' }}>
                                  {new Date(txn.date + "T00:00:00").toLocaleDateString("en-IN", {
                                    day: "numeric", month: "short", year: "numeric",
                                  })}
                                </span>
                                {txn.category_name && (
                                  <span
                                    className="inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-semibold leading-none"
                                    style={
                                      txn.category_user_id && txn.category_color
                                        ? { backgroundColor: `${txn.category_color}1a`, color: txn.category_color }
                                        : { background: 'var(--tag-bg)', color: 'var(--tag-text)' }
                                    }
                                  >
                                    {txn.category_name}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Col 2 — Method (15%): payment method pill, centered */}
                          <div className="flex justify-center">
                            {paymentLabel ? (
                              <span
                                className="inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide leading-none"
                                style={{ background: 'var(--tag-bg)', color: 'var(--tag-text)', border: '1px solid var(--tag-border)' }}
                              >
                                {paymentLabel}
                              </span>
                            ) : (
                              <span className="text-xs select-none" style={{ color: 'var(--text-tertiary)' }}>—</span>
                            )}
                          </div>

                          {/* Col 3 — Amount (20%): right-aligned, income green / expense red */}
                          <div className="text-right">
                            <span
                              className="text-sm font-semibold tabular-nums"
                              style={{ color: isIncome ? 'var(--income-color)' : 'var(--expense-color)' }}
                            >
                              {isIncome ? "+" : "-"}{formatINR(txn.amount)}
                            </span>
                          </div>

                          {/* Col 4 — Actions (15%): edit + delete pinned to far right */}
                          <div className="flex items-center justify-end gap-0.5">
                            {!isOptimistic && (
                              <>
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
                              </>
                            )}
                          </div>
                        </div>
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
