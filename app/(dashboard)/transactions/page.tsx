import type { Metadata } from "next";
import { Suspense } from "react";

export const metadata: Metadata = {
  title: "Transactions — FinTrack India",
};
import { createClient, getUser } from "@/lib/supabase/server";
import { formatINR } from "@/lib/utils";
import { TransactionDialog } from "@/components/transactions/transaction-dialog";
import { TransactionFilters } from "@/components/transactions/transaction-filters";
import { TransactionCalendar } from "@/components/transactions/transaction-calendar";
import { TransactionManager } from "@/components/transactions/transaction-manager";
import { ActiveGoalsWidget } from "@/components/transactions/active-goals-widget";
import { UpcomingBillsWidget } from "@/components/transactions/upcoming-bills-widget";

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

function DeltaBadge({ current, previous, type }: { current: number; previous: number; type: "income" | "expense" | "net" }) {
  if (previous === 0) return null;
  const delta = ((current - previous) / Math.abs(previous)) * 100;
  
  if (delta === 0) return null;
  
  const isPositive = delta > 0;
  const isNegative = delta < 0;
  
  let isGood = false;
  if (type === "income" || type === "net") isGood = isPositive;
  if (type === "expense") isGood = isNegative;
  
  const colorClass = isGood ? "text-green-600" : "text-red-500";
  const icon = isPositive ? "↑" : "↓";
  
  return (
    <div className="flex items-center gap-1 mt-1">
       <span className={`text-xs font-medium ${colorClass}`}>
         {icon} {Math.abs(delta).toFixed(0)}%
       </span>
       <span className="text-xs text-gray-400">vs last month</span>
    </div>
  );
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
    .select("id, name, type, color, icon")
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
    .select("*, categories(name, color, type)")
    .eq("user_id", user!.id)
    .order("date", { ascending: false })
    .order("created_at", { ascending: false });

  if (search) query = query.ilike("description", `%${search}%`);
  if (categoryFilter) query = query.eq("category_id", categoryFilter);

  const dateRange = getDateRange(period);
  if (dateRange?.start) query = query.gte("date", dateRange.start);
  if (dateRange?.end) query = query.lte("date", dateRange.end);

  let prevQuery = supabase.from("transactions").select("amount, type").eq("user_id", user!.id);
  if (search) prevQuery = prevQuery.ilike("description", `%${search}%`);
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

  return (
    <main className="p-6 md:p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Transactions</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {txns.length === 0
              ? "No transactions match your filters"
              : `${txns.length} transaction${txns.length !== 1 ? "s" : ""} found`}
          </p>
        </div>
        <div className="flex items-center gap-2" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6 lg:gap-8 items-start">
        <div className="min-w-0">
          {/* Summary stats */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        <div className="rounded-xl border border-gray-100 bg-white px-4 py-3 flex flex-col justify-between">
          <div>
            <p className="text-xs text-gray-500 mb-1">Income</p>
            <p className="text-base font-semibold text-green-600 tabular-nums">
              {formatINR(totalIncome)}
            </p>
          </div>
          <DeltaBadge current={totalIncome} previous={prevIncome} type="income" />
        </div>
        <div className="rounded-xl border border-gray-100 bg-white px-4 py-3 flex flex-col justify-between">
          <div>
            <p className="text-xs text-gray-500 mb-1">Expenses</p>
            <p className="text-base font-semibold text-red-600 tabular-nums">
              {formatINR(totalExpense)}
            </p>
          </div>
          <DeltaBadge current={totalExpense} previous={prevExpense} type="expense" />
        </div>
        <div className="rounded-xl border border-gray-100 bg-white px-4 py-3 flex flex-col justify-between">
          <div>
            <p className="text-xs text-gray-500 mb-1">Net</p>
            <p
              className={`text-base font-semibold tabular-nums ${
                net >= 0 ? "text-green-600" : "text-red-600"
              }`}
            >
              {net >= 0 ? "+" : ""}
              {formatINR(net)}
            </p>
          </div>
          <DeltaBadge current={net} previous={prevNet} type="net" />
        </div>
      </div>

      {/* Filters — always visible when there are no transactions (so user can clear them) */}
      {txns.length === 0 && (search || categoryFilter || period !== "this_month") && (
        <div className="mb-4">
          <Suspense fallback={null}>
            <TransactionFilters
              categories={cats.map((c) => ({ id: c.id, name: c.name }))}
              showExportMenu
            />
          </Suspense>
        </div>
      )}

      {/* Empty state */}
      {txns.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-white py-16 text-center px-6">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 mb-4">
            <svg className="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 14.25l6-6m4.5-3.493V21.75l-3.75-1.5-3.75 1.5-3.75-1.5-3.75 1.5V4.757c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0c1.1.128 1.907 1.077 1.907 2.185z" />
            </svg>
          </div>
          {search || categoryFilter ? (
            <>
              <p className="text-sm font-medium text-gray-900">{emptyFilterMessage}</p>
              <p className="text-sm text-gray-500 mt-1">Try adjusting or clearing the filters above.</p>
            </>
          ) : (
            <>
              <p className="text-sm font-medium text-gray-900">Nothing here yet</p>
              <p className="text-sm text-gray-500 mt-1 mb-5">
                Track your first income or expense to see it here.
              </p>
              <TransactionDialog categories={cats} activeMonth={activePeriodMonth} />
            </>
          )}
        </div>
      )}

      {/* Transaction list + filters — managed by client component for bulk selection */}
      {txns.length > 0 && (
        <Suspense fallback={null}>
          <TransactionManager
            initialTransactions={txns.slice(0, 20).map((txn) => {
              const cat = txn.categories as
                | { name: string; color: string | null; type: string }
                | null;
              return {
                id: txn.id,
                type: txn.type as "income" | "expense",
                amount: Number(txn.amount),
                date: txn.date,
                description: txn.description ?? "",
                category_id: txn.category_id ?? "",
                payment_method: null,
                category_name: cat?.name ?? null,
                category_color: cat?.color ?? null,
                category_icon: null,
              };
            })}
            categories={cats}
            activeMonth={activePeriodMonth}
            filters={{
              search,
              typeFilter,
              categoryFilter,
              period,
            }}
          />
        </Suspense>
      )}
        </div>

        {/* Right Column: Spending Calendar, Goals & Bills Widgets */}
        <div className="lg:sticky lg:top-8 w-full flex flex-col">
          <TransactionCalendar inline />
          <ActiveGoalsWidget transactions={txns} />
          <UpcomingBillsWidget categories={cats} activeMonth={activePeriodMonth} />
        </div>
      </div>
    </main>
  );
}
