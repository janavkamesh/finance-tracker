"use client";

import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { List, CalendarDays, CheckSquare, X, Receipt, Pencil, Trash2 } from "lucide-react";
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

// ── Detail Panel ──────────────────────────────────────────────────────────────
function TransactionDetailPanel({
  txn,
  categories,
  activeMonth,
}: {
  txn: TxnRow | null;
  categories: CategoryItem[];
  activeMonth?: string;
}) {
  if (!txn) {
    return (
      <div
        className="flex flex-col items-center justify-center rounded-2xl h-full min-h-[320px] text-center px-8 py-12"
        style={{
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border-default)',
          boxShadow: 'var(--card-shadow)',
        }}
      >
        <div
          className="flex h-14 w-14 items-center justify-center rounded-2xl mb-4"
          style={{ background: 'var(--tag-bg)' }}
        >
          <Receipt className="size-6" style={{ color: 'var(--text-tertiary)' }} />
        </div>
        <p className="text-sm font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>
          No transaction selected
        </p>
        <p className="text-xs leading-relaxed" style={{ color: 'var(--text-tertiary)' }}>
          Select a transaction to view details.
        </p>
      </div>
    );
  }

  const isIncome = txn.type === "income";
  const isOptimistic = txn.id.startsWith("opt-");
  const Icon = txn.category_name
    ? getCategoryIcon({ name: txn.category_name, icon: txn.category_icon ?? undefined })
    : null;
  const paymentLabel = txn.payment_method ? PAYMENT_LABELS[txn.payment_method] ?? txn.payment_method : null;

  const dateObj = new Date(txn.date + "T00:00:00");
  const formattedDate = dateObj.toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div
      className="flex flex-col rounded-2xl overflow-hidden"
      style={{
        background: 'var(--bg-elevated)',
        border: '1px solid var(--border-default)',
        boxShadow: 'var(--card-shadow)',
      }}
    >
      {/* Header strip */}
      <div
        className="px-5 py-3 flex items-center justify-between"
        style={{ borderBottom: '1px solid var(--border-default)' }}
      >
        <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>
          Transaction Details
        </span>
        <span
          className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
          style={
            isIncome
              ? { background: 'rgba(52,211,153,0.12)', color: 'var(--income-color)' }
              : { background: 'rgba(248,113,113,0.12)', color: 'var(--expense-color)' }
          }
        >
          {isIncome ? "Income" : "Expense"}
        </span>
      </div>

      {/* Body */}
      <div className="flex flex-col flex-1 px-5 py-5 gap-5">
        {/* Category icon + description */}
        <div className="flex items-center gap-3">
          <div
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl"
            style={
              txn.category_user_id && txn.category_color
                ? { backgroundColor: `${txn.category_color}22`, color: txn.category_color }
                : { background: 'var(--tag-bg)', color: 'var(--text-secondary)' }
            }
          >
            {Icon ? (
              <Icon className="size-5" />
            ) : (
              <span
                className={cn("h-3 w-3 rounded-full", isIncome ? "bg-green-500" : "bg-red-500")}
              />
            )}
          </div>
          <div className="min-w-0">
            <p className="text-base font-semibold leading-tight truncate" style={{ color: 'var(--text-primary)' }}>
              {txn.description || txn.category_name || "—"}
            </p>
            {txn.category_name && (
              <span
                className="inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-semibold leading-none mt-1"
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

        {/* Amount — hero number */}
        <div
          className="rounded-xl px-5 py-4 text-center"
          style={
            isIncome
              ? { background: 'rgba(52,211,153,0.07)', border: '1px solid rgba(52,211,153,0.18)' }
              : { background: 'rgba(248,113,113,0.07)', border: '1px solid rgba(248,113,113,0.18)' }
          }
        >
          <p className="text-xs font-medium mb-1" style={{ color: 'var(--text-tertiary)' }}>
            {isIncome ? "Amount Received" : "Amount Spent"}
          </p>
          <p
            className="text-3xl font-bold tabular-nums tracking-tight"
            style={{ color: isIncome ? 'var(--income-color)' : 'var(--expense-color)' }}
          >
            {isIncome ? "+" : "−"}{formatINR(txn.amount)}
          </p>
        </div>

        {/* Meta rows */}
        <div
          className="rounded-xl divide-y overflow-hidden"
          style={{ border: '1px solid var(--border-default)' }}
        >
          {/* Date */}
          <div className="flex items-center justify-between px-4 py-3 gap-3">
            <span className="text-xs font-medium" style={{ color: 'var(--text-tertiary)' }}>Date</span>
            <span className="text-xs font-semibold text-right" style={{ color: 'var(--text-primary)' }}>
              {formattedDate}
            </span>
          </div>

          {/* Payment method */}
          <div className="flex items-center justify-between px-4 py-3 gap-3">
            <span className="text-xs font-medium" style={{ color: 'var(--text-tertiary)' }}>Paid via</span>
            {paymentLabel ? (
              <span
                className="text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-md"
                style={{ background: 'var(--tag-bg)', color: 'var(--tag-text)', border: '1px solid var(--tag-border)' }}
              >
                {paymentLabel}
              </span>
            ) : (
              <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>—</span>
            )}
          </div>
        </div>
      </div>

      {/* Footer actions */}
      {!isOptimistic && (
        <div
          className="px-5 pb-5 pt-1 flex flex-col gap-2"
        >
          {/* Edit button — primary */}
          <TransactionDialog
            categories={categories}
            activeMonth={activeMonth}
            transaction={{
              id: txn.id,
              type: txn.type,
              amount: txn.amount,
              category_id: txn.category_id,
              description: txn.description,
              date: txn.date,
            }}
            triggerClassName="w-full inline-flex items-center justify-center gap-2 h-10 rounded-xl text-sm font-semibold transition-all"
            triggerStyle={{
              background: 'var(--cta-primary-bg)',
              color: 'var(--cta-primary-text)',
              border: '1px solid var(--cta-primary-border)',
            }}
            triggerLabel={
              <>
                <Pencil className="size-3.5" />
                Edit Transaction
              </>
            }
          />
          {/* Delete button — secondary/destructive */}
          <DeleteTransactionButton
            id={txn.id}
            variant="full"
          />
        </div>
      )}
    </div>
  );
}

export function TransactionManager({ initialTransactions, categories, activeMonth, emptyMessage, filters }: Props) {
  // ── Selection state ───────────────────────────────────────────────
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectionMode, setSelectionMode] = useState(false);

  // ── Master-Detail: selected transaction for the right panel ───────
  const [detailTxn, setDetailTxn] = useState<TxnRow | null>(null);

  // ── View toggle (List / Calendar) — UI only for now ───────────────
  const [viewMode, setViewMode] = useState<"list" | "calendar">("list");

  // ── Type tab — client-side, zero latency ──────────────────────────
  const [typeTab, setTypeTab] = useState<"all" | "income" | "expense">("all");

  // ── Infinite scroll state ─────────────────────────────────────────
  const [transactions, setTransactions] = useState<TxnRow[]>(initialTransactions);
  const [hasMore, setHasMore] = useState(initialTransactions.length === 20);
  const [isFetching, setIsFetching] = useState(false);
  const [offset, setOffset] = useState(20);

  // Track the previous initialTransactions to skip reference-only changes
  // (Next.js RSC re-renders create new array references even with identical data,
  // which would wipe optimistic entries before the real transaction arrives)
  const prevInitRef = useRef(initialTransactions);

  // Sync when server-side filters change (search / period / category)
  useEffect(() => {
    const prev = prevInitRef.current;
    prevInitRef.current = initialTransactions;

    // If only the reference changed but IDs are identical, skip the replacement
    // so any pending optimistic entries are preserved until the real row arrives.
    const idsUnchanged =
      initialTransactions.length === prev.length &&
      initialTransactions.every((t, i) => t.id === prev[i]?.id);
    if (idsUnchanged) return;

    setTransactions(initialTransactions);
    setOffset(20);
    setHasMore(initialTransactions.length === 20);
    setSelectedIds(new Set());
    setDetailTxn(null);
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
    setDetailTxn((prev) => (prev?.id === tempId ? null : prev));
  }, []);

  // ── Live URL params drive instant client-side narrowing ───────────
  const searchParams = useSearchParams();
  const liveCategory = searchParams.get("category") ?? "";
  const livePeriod   = searchParams.get("period") ?? "this_month";
  const liveSearch   = (searchParams.get("search") ?? "").trim().toLowerCase();

  // Period → inclusive date range
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
    return {};
  }, [livePeriod]);

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

  const displayedTransactions = useMemo(
    () => typeTab === "all" ? clientFiltered : clientFiltered.filter((t) => t.type === typeTab),
    [clientFiltered, typeTab]
  );

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
    setSelectedIds(new Set());
  }

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
    setSelectionMode(false);
  }, []);
  const filterCats    = categories.map((c) => ({ id: c.id, name: c.name }));
  const selectedArray = Array.from(selectedIds);

  // ── Pre-computed calendar data — seeds TransactionCalendar cache so the
  //    current month renders instantly with zero network round-trip. ─────
  const calendarInitialData = useMemo(() => {
    const data: Record<string, { income: number; expense: number }> = {};
    transactions.forEach((t) => {
      if (t.id.startsWith("opt-")) return;
      if (!data[t.date]) data[t.date] = { income: 0, expense: 0 };
      if (t.type === "income") data[t.date].income += t.amount;
      else data[t.date].expense += t.amount;
    });
    return data;
  }, [transactions]);

  // ── Last 7 days summary (for calendar sidebar) ───────────────────
  const last7Days = useMemo(() => {
    const pad = (n: number) => String(n).padStart(2, "0");
    const days: { dateStr: string; label: string; income: number; expense: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
      const label = d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
      const dayTxns = transactions.filter((t) => t.date === dateStr && !t.id.startsWith("opt-"));
      const income  = dayTxns.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
      const expense = dayTxns.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);
      days.push({ dateStr, label, income, expense });
    }
    return days;
  }, [transactions]);

  // ── Group displayed transactions by date ──────────────────────────
  const groupedTransactions = useMemo(() => {
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

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
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center flex-wrap gap-3 flex-1 min-w-0">
              {/* Type tabs */}
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

              <TransactionFilters categories={filterCats} showExportMenu wrapperClassName="contents" />
            </div>

            <div className="shrink-0 ml-auto">
              <TransactionDialog
                categories={categories}
                activeMonth={activeMonth}
                onOptimisticAdd={addOptimistic}
                onOptimisticRemove={removeOptimistic}
              />
            </div>
          </div>

          {/* Row 2: Select toggle (list only) + View toggle */}
          <div className="flex items-center justify-between gap-3">
            {viewMode === "list" ? (
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
            ) : (
              <div />
            )}

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

      {/* ── Calendar split layout ──────────────────────────────────── */}
      {viewMode === "calendar" && (
        <div className="grid grid-cols-[65fr_35fr] gap-5 items-start">
          {/* Left: Spending Calendar (65%) */}
          <div className="min-w-0">
            <TransactionCalendar inline initialDayData={calendarInitialData} />
          </div>

          {/* Right: Last 7 Days sidebar (35%) */}
          <div className="sticky top-4">
            <div
              className="rounded-2xl overflow-hidden"
              style={{
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border-default)',
                boxShadow: 'var(--card-shadow)',
              }}
            >
              {/* Card header */}
              <div
                className="px-5 py-3.5"
                style={{ borderBottom: '1px solid var(--border-default)' }}
              >
                <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                  Last 7 Days
                </h3>
              </div>

              {/* Day rows */}
              <div className="divide-y" style={{ borderColor: 'var(--border-default)' }}>
                {last7Days.map(({ dateStr, label, income, expense }) => {
                  const hasActivity = income > 0 || expense > 0;
                  const isToday = dateStr === (() => {
                    const n = new Date();
                    return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, "0")}-${String(n.getDate()).padStart(2, "0")}`;
                  })();
                  return (
                    <div
                      key={dateStr}
                      className="flex items-center gap-3 px-5 py-3"
                      style={isToday ? { background: 'var(--bg-active-nav)' } : undefined}
                    >
                      {/* Date label */}
                      <div className="w-14 shrink-0">
                        <p
                          className="text-xs font-semibold"
                          style={{ color: isToday ? 'var(--text-brand)' : 'var(--text-primary)' }}
                        >
                          {label}
                        </p>
                        {isToday && (
                          <p className="text-[10px]" style={{ color: 'var(--text-brand)' }}>Today</p>
                        )}
                      </div>

                      {/* Income + Expense amounts */}
                      <div className="flex flex-col gap-0.5 flex-1 min-w-0">
                        {income > 0 && (
                          <p className="text-xs font-semibold tabular-nums" style={{ color: 'var(--income-color)' }}>
                            +{formatINR(income)}
                          </p>
                        )}
                        {expense > 0 && (
                          <p className="text-xs font-semibold tabular-nums" style={{ color: 'var(--expense-color)' }}>
                            −{formatINR(expense)}
                          </p>
                        )}
                        {!hasActivity && (
                          <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>—</p>
                        )}
                      </div>

                      {/* Net indicator dot */}
                      {hasActivity && (
                        <div
                          className="h-1.5 w-1.5 rounded-full shrink-0"
                          style={{
                            background: income >= expense
                              ? 'var(--income-color)'
                              : 'var(--expense-color)',
                          }}
                        />
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Footer: 7-day totals */}
              {(() => {
                const totalIncome  = last7Days.reduce((s, d) => s + d.income,  0);
                const totalExpense = last7Days.reduce((s, d) => s + d.expense, 0);
                return (
                  <div
                    className="px-5 py-3 flex items-center justify-between gap-3"
                    style={{ borderTop: '1px solid var(--border-default)', background: 'var(--tag-bg)' }}
                  >
                    <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>
                      7-Day Net
                    </span>
                    <span
                      className="text-sm font-bold tabular-nums"
                      style={{ color: totalIncome >= totalExpense ? 'var(--income-color)' : 'var(--expense-color)' }}
                    >
                      {totalIncome >= totalExpense ? "+" : "−"}{formatINR(Math.abs(totalIncome - totalExpense))}
                    </span>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
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

      {/* ── Master-Detail layout ────────────────────────────────────── */}
      {viewMode === "list" && displayedTransactions.length > 0 && (
        <div className="grid grid-cols-[65fr_35fr] gap-5 items-start">
          {/* ── Master: transaction list (65%) ──────────────────────── */}
          <div className="min-w-0">
            <div
              className="w-full rounded-2xl overflow-hidden relative"
              style={{
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border-default)',
                boxShadow: 'var(--card-shadow)',
              }}
            >
              {/* List header */}
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

                    <ul className="divide-y divide-black/[0.05] dark:divide-white/[0.05]">
                      {txns.map((txn) => {
                        const isIncome   = txn.type === "income";
                        const isSelected = selectedIds.has(txn.id);
                        const isDetail   = detailTxn?.id === txn.id;
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
                            onClick={() => !selectionMode && setDetailTxn(isDetail ? null : txn)}
                            className={cn(
                              "flex items-center gap-3 px-5 py-3 transition-colors group",
                              !selectionMode && "cursor-pointer",
                              isSelected
                                ? "bg-[rgba(22,101,52,0.08)] dark:bg-[rgba(0,185,107,0.10)]"
                                : isDetail
                                  ? "bg-[rgba(22,101,52,0.06)] dark:bg-[rgba(0,185,107,0.08)]"
                                  : "hover:bg-[rgba(22,101,52,0.05)] dark:hover:bg-[rgba(0,185,107,0.06)]",
                              isOptimistic ? "opacity-70" : ""
                            )}
                          >
                            {/* Active indicator bar */}
                            {isDetail && !isSelected && (
                              <div
                                className="absolute left-0 top-0 bottom-0 w-0.5 rounded-r"
                                style={{ background: 'var(--text-brand)' }}
                              />
                            )}

                            {/* Checkbox — only in selection mode */}
                            {selectionMode && (
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => toggleOne(txn.id)}
                                disabled={isOptimistic}
                                onClick={(e) => e.stopPropagation()}
                                className="h-4 w-4 rounded border-gray-300 accent-[#1E6B4E] cursor-pointer shrink-0"
                                aria-label={`Select ${txn.description || txn.category_name || "transaction"}`}
                              />
                            )}

                            {/* 3-column grid for master list (drop method column to save width) */}
                            <div
                              className="grid flex-1 min-w-0 items-center gap-x-3"
                              style={{ gridTemplateColumns: "1fr auto auto" }}
                            >
                              {/* Col 1 — Context: icon + description + date + category pill */}
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
                                  <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
                                    {txn.description || txn.category_name || "—"}
                                    {isOptimistic && (
                                      <span className="ml-1.5 text-[10px] text-gray-400 font-normal">saving…</span>
                                    )}
                                  </p>
                                  {/* Meta row: category · date · payment — matches Home page row exactly */}
                                  <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
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
                                    <span className="text-xs shrink-0 tabular-nums" style={{ color: 'var(--text-tertiary)' }}>
                                      {new Date(txn.date + "T00:00:00").toLocaleDateString("en-IN", {
                                        day: "numeric", month: "short", year: "numeric",
                                      })}
                                    </span>
                                    {paymentLabel && (
                                      <span
                                        className="inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide leading-none"
                                        style={{ background: 'var(--tag-bg)', color: 'var(--tag-text)', border: '1px solid var(--tag-border)' }}
                                      >
                                        {paymentLabel}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>

                              {/* Col 2 — Amount */}
                              <div className="text-right shrink-0">
                                <span
                                  className="text-sm font-semibold tabular-nums"
                                  style={{ color: isIncome ? 'var(--income-color)' : 'var(--expense-color)' }}
                                >
                                  {isIncome ? "+" : "-"}{formatINR(txn.amount)}
                                </span>
                              </div>

                              {/* Col 3 — Quick actions (icon-only, shown on hover) */}
                              <div
                                className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={(e) => e.stopPropagation()}
                              >
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
          </div>

          {/* ── Detail: transaction inspector (35%) ─────────────────── */}
          <div className="sticky top-4">
            <TransactionDetailPanel
              txn={detailTxn}
              categories={categories}
              activeMonth={activeMonth}
            />
          </div>
        </div>
      )}
    </>
  );
}
