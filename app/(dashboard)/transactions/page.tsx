import type { Metadata } from "next";
import { Suspense } from "react";

export const metadata: Metadata = {
  title: "Transactions — FinTrack India",
};
import { createClient, getUser } from "@/lib/supabase/server";
import { formatINR } from "@/lib/utils";
import { TransactionManager } from "@/components/transactions/transaction-manager";

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

// ── Active period → representative month for smart date defaulting ────────────
// Returns "YYYY-MM" for periods anchored to a past month, undefined otherwise.
function getPeriodMonth(period: string): string | undefined {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  if (period === "last_month") {
    const d = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
  }
  if (period === "3_months") {
    const d = new Date(now.getFullYear(), now.getMonth() - 2, 1);
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
  }
  return undefined; // this_month / all → default to today inside the dialog
}

// ── Category-aware empty-state microcopy ──────────────────────────────────────
// Keys must exactly match the system category names seeded in the DB.
const CATEGORY_EMPTY_MESSAGES: Record<string, string> = {
  "Bills & Recharge":  "All paid up! No bills or recharges logged yet.",
  "Education":         "No study expenses this month. Learning for free?",
  "EMI / Loans":       "Debt-free for now! No EMI or loan payments found.",
  "Entertainment":     "All work and no play? No entertainment logged yet.",
  "Food & Dining":     "No dining out yet! Home-cooked meals it is.",
  "Health":            "Looking healthy! No medical or health expenses found.",
  "Other":             "No miscellaneous transactions logged yet.",
  "Rent & Housing":    "No housing expenses logged. Couch surfing this month?",
  "Salary / Income":   "No income logged yet. Waiting for payday?",
  "Shopping":          "Your wallet is safe! No shopping trips logged.",
  "Transport":         "No transport expenses. Staying local this month?",
  "Travel":            "No vacations logged. Time to plan a getaway?",
};

function getDateRange(period: string): { start: string; end?: string } | null {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const fmt = (d: Date) =>
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

  if (period === "this_month") {
    const start = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-01`;
    const end = fmt(new Date(now.getFullYear(), now.getMonth() + 1, 0));
    return { start, end };
  }
  if (period === "last_month") {
    const first = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const last = new Date(now.getFullYear(), now.getMonth(), 0);
    return { start: fmt(first), end: fmt(last) };
  }
  if (period === "3_months") {
    const first = new Date(now.getFullYear(), now.getMonth() - 2, 1);
    return { start: fmt(first) };
  }
  return null; // all time
}

function getPreviousDateRange(period: string): { start: string; end?: string } | null {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const fmt = (d: Date) =>
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

  if (period === "this_month") {
    const first = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const last = new Date(now.getFullYear(), now.getMonth(), 0);
    return { start: fmt(first), end: fmt(last) };
  }
  if (period === "last_month") {
    const first = new Date(now.getFullYear(), now.getMonth() - 2, 1);
    const last = new Date(now.getFullYear(), now.getMonth() - 1, 0);
    return { start: fmt(first), end: fmt(last) };
  }
  if (period === "3_months") {
    const first = new Date(now.getFullYear(), now.getMonth() - 5, 1);
    const last = new Date(now.getFullYear(), now.getMonth() - 2, 0);
    return { start: fmt(first), end: fmt(last) };
  }
  return null;
}

function compactINR(value: number) {
  const abs = Math.abs(value);
  if (abs >= 10_000_000) return `₹${(value / 10_000_000).toFixed(1)}Cr`;
  if (abs >= 100_000)    return `₹${(value / 100_000).toFixed(1)}L`;
  if (abs >= 1_000)      return `₹${(value / 1_000).toFixed(1)}K`;
  return `₹${value.toLocaleString("en-IN")}`;
}

function computeDelta(current: number, previous: number) {
  if (current === previous) return null;
  if (previous === 0) return current > 0 ? { up: true, label: compactINR(current) } : null;
  const diff = current - previous;
  return { up: diff > 0, label: compactINR(Math.abs(diff)) };
}

export default async function TransactionsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const filters = await searchParams;
  const search = typeof filters.search === "string" ? filters.search : "";
  const typeFilter = typeof filters.type === "string" ? filters.type : "";
  const period = typeof filters.period === "string" ? filters.period : "this_month";
  const categoryFilter =
    typeof filters.category === "string" ? filters.category : "";

  const [user, supabase] = await Promise.all([getUser(), createClient()]);

  // Categories for filter dropdown + add/edit dialog
  const { data: categories } = await supabase
    .from("categories")
    .select("id, name, type, color, icon, user_id, created_at")
    .or(`user_id.eq.${user!.id},user_id.is.null`)
    .order("name");

  const cats = categories ?? [];

  // Active period month for context-aware date defaulting in Add Transaction dialog
  const activePeriodMonth = getPeriodMonth(period);

  // Resolve active category name for dynamic empty-state messages
  const activeCategoryName = categoryFilter
    ? (cats.find((c) => c.id === categoryFilter)?.name ?? null)
    : null;
  const emptyFilterMessage =
    activeCategoryName && CATEGORY_EMPTY_MESSAGES[activeCategoryName]
      ? CATEGORY_EMPTY_MESSAGES[activeCategoryName]
      : "No transactions match your current filters.";

  // Build transactions query with filters
  let query = supabase
    .from("transactions")
    .select("*, categories(name, color, type, user_id)")
    .eq("user_id", user!.id)
    .order("date", { ascending: false })
    .order("created_at", { ascending: false });

  // Search is applied client-side for instant, case-insensitive results that
  // also match category names. Removing it from the server query keeps
  // TransactionManager always mounted so the search input never loses focus.
  if (categoryFilter) query = query.eq("category_id", categoryFilter);

  const dateRange = getDateRange(period);
  if (dateRange?.start) query = query.gte("date", dateRange.start);
  if (dateRange?.end) query = query.lte("date", dateRange.end);

  let prevQuery = supabase.from("transactions").select("amount, type").eq("user_id", user!.id);
  if (categoryFilter) prevQuery = prevQuery.eq("category_id", categoryFilter);
  
  const prevDateRange = getPreviousDateRange(period);
  if (prevDateRange?.start) prevQuery = prevQuery.gte("date", prevDateRange.start);
  if (prevDateRange?.end) prevQuery = prevQuery.lte("date", prevDateRange.end);

  // Run both queries in parallel
  const [
    { data: transactions },
    { data: prevTransactionsData }
  ] = await Promise.all([
    query,
    prevDateRange ? prevQuery : Promise.resolve({ data: [] })
  ]);

  const txns = transactions ?? [];
  const prevTxns = prevTransactionsData ?? [];

  // Summary stats from filtered results
  const totalIncome = txns
    .filter((t) => t.type === "income")
    .reduce((sum, t) => sum + Number(t.amount), 0);
  const totalExpense = txns
    .filter((t) => t.type === "expense")
    .reduce((sum, t) => sum + Number(t.amount), 0);
  const net = totalIncome - totalExpense;

  // Previous summary stats
  const prevIncome = prevTxns
    .filter((t) => t.type === "income")
    .reduce((sum, t) => sum + Number(t.amount), 0);
  const prevExpense = prevTxns
    .filter((t) => t.type === "expense")
    .reduce((sum, t) => sum + Number(t.amount), 0);
  const prevNet = prevIncome - prevExpense;

  const incDelta = computeDelta(totalIncome, prevIncome);
  const expDelta = computeDelta(totalExpense, prevExpense);
  const netDelta = computeDelta(net, prevNet);

  return (
    <>
      {/* Sticky header */}
      <div
        className="sticky z-10 h-[64px] md:h-[88px] px-4 md:px-8 flex items-center justify-between gap-4"
        style={{ top: 'var(--mobile-header-h, 56px)', background: 'var(--bg-surface)', borderBottom: '1px solid var(--border-default)' }}
      >
        <div className="flex-1 min-w-0">
          <h1 className="text-lg md:text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Transactions</h1>
          <p className="text-xs md:text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>
            {txns.length === 0
              ? "No transactions match your filters"
              : `${txns.length} transaction${txns.length !== 1 ? "s" : ""} found`}
          </p>
        </div>
      </div>

      <main className="px-4 md:px-8 pb-8 pt-4">
        {/* Summary cards — 1 column on mobile, 3 on md+ */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
          <div className="rounded-xl px-4 py-3" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', boxShadow: 'var(--card-shadow)' }}>
            {/* Mobile row */}
            <div className="flex items-center justify-between gap-3 md:hidden">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-green-500 shrink-0" />
                <span className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Income</span>
              </div>
              <div className="flex items-baseline gap-2">
                <p className="text-base font-bold tabular-nums" style={{ color: 'var(--income-color)' }}>{formatINR(totalIncome)}</p>
                {incDelta && <span className="text-[11px] font-medium tabular-nums" style={{ color: 'var(--text-tertiary)' }}>{incDelta.up ? "↑" : "↓"} {incDelta.label}</span>}
              </div>
            </div>
            {/* Desktop stacked */}
            <div className="hidden md:block">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="h-2 w-2 rounded-full bg-green-500" />
                <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>Income</span>
              </div>
              <div className="flex items-baseline gap-2">
                <p className="text-lg font-bold tabular-nums" style={{ color: 'var(--income-color)' }}>{formatINR(totalIncome)}</p>
                {incDelta && <span className="text-[11px] font-medium tabular-nums truncate" style={{ color: 'var(--text-tertiary)' }}>{incDelta.up ? "↑" : "↓"} {incDelta.label}</span>}
              </div>
            </div>
          </div>
          <div className="rounded-xl px-4 py-3" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', boxShadow: 'var(--card-shadow)' }}>
            {/* Mobile row */}
            <div className="flex items-center justify-between gap-3 md:hidden">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-red-500 shrink-0" />
                <span className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Expenses</span>
              </div>
              <div className="flex items-baseline gap-2">
                <p className="text-base font-bold tabular-nums" style={{ color: 'var(--expense-color)' }}>{formatINR(totalExpense)}</p>
                {expDelta && <span className="text-[11px] font-medium tabular-nums" style={{ color: 'var(--text-tertiary)' }}>{expDelta.up ? "↑" : "↓"} {expDelta.label}</span>}
              </div>
            </div>
            {/* Desktop stacked */}
            <div className="hidden md:block">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="h-2 w-2 rounded-full bg-red-500" />
                <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>Expenses</span>
              </div>
              <div className="flex items-baseline gap-2">
                <p className="text-lg font-bold tabular-nums" style={{ color: 'var(--expense-color)' }}>{formatINR(totalExpense)}</p>
                {expDelta && <span className="text-[11px] font-medium tabular-nums truncate" style={{ color: 'var(--text-tertiary)' }}>{expDelta.up ? "↑" : "↓"} {expDelta.label}</span>}
              </div>
            </div>
          </div>
          <div className="rounded-xl px-4 py-3" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', boxShadow: 'var(--card-shadow)' }}>
            {/* Mobile row */}
            <div className="flex items-center justify-between gap-3 md:hidden">
              <div className="flex items-center gap-2">
                <span className={`h-2 w-2 rounded-full shrink-0 ${net >= 0 ? "bg-green-500" : "bg-red-500"}`} />
                <span className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Net savings</span>
              </div>
              <div className="flex items-baseline gap-2">
                <p className="text-base font-bold tabular-nums" style={{ color: net >= 0 ? 'var(--income-color)' : 'var(--expense-color)' }}>
                  {net >= 0 ? "+" : ""}{formatINR(net)}
                </p>
                {netDelta && <span className="text-[11px] font-medium tabular-nums" style={{ color: 'var(--text-tertiary)' }}>{netDelta.up ? "↑" : "↓"} {netDelta.label}</span>}
              </div>
            </div>
            {/* Desktop stacked */}
            <div className="hidden md:block">
              <div className="flex items-center gap-2 mb-1.5">
                <span className={`h-2 w-2 rounded-full ${net >= 0 ? "bg-green-500" : "bg-red-500"}`} />
                <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>Net savings</span>
              </div>
              <div className="flex items-baseline gap-2">
                <p className={`text-lg font-bold tabular-nums ${net >= 0 ? "text-green-600" : "text-red-600"}`}>
                  {net >= 0 ? "+" : ""}{formatINR(net)}
                </p>
                {netDelta && <span className="text-[11px] font-medium tabular-nums text-gray-400 truncate">{netDelta.up ? "↑" : "↓"} {netDelta.label}</span>}
              </div>
            </div>
          </div>
        </div>

        {/* Transaction list + filters — always mounted so the search input never loses focus.
            Empty-state rendering is handled inside TransactionManager. */}
        <Suspense fallback={null}>
          <TransactionManager
            initialTransactions={txns.slice(0, 20).map((txn) => {
              const cat = txn.categories as
                | { name: string; color: string | null; type: string; user_id: string | null }
                | null;
              return {
                id: txn.id,
                type: txn.type as "income" | "expense",
                amount: Number(txn.amount),
                date: txn.date,
                description: txn.description ?? "",
                category_id: txn.category_id ?? "",
                payment_method: (txn as Record<string, unknown>).payment_method as string | null ?? null,
                category_name: cat?.name ?? null,
                category_color: cat?.color ?? null,
                category_icon: null,
                category_user_id: cat?.user_id ?? null,
              };
            })}
            categories={cats}
            activeMonth={activePeriodMonth}
            emptyMessage={emptyFilterMessage}
            filters={{
              search: "",
              typeFilter,
              categoryFilter,
              period,
            }}
          />
        </Suspense>
      </main>
    </>
  );
}
