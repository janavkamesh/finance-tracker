import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Dashboard — FinTrack India",
};
import { ArrowRight } from "lucide-react";
import { createClient, getUser } from "@/lib/supabase/server";
import { formatINR } from "@/lib/utils";
import { type MonthlyData } from "@/components/dashboard/monthly-bar-chart";
import { TrendChartCard } from "@/components/dashboard/trend-chart-card";
import { CategoryPieChart, type CategorySlice } from "@/components/dashboard/category-pie-chart";
import { CategoryLimits } from "@/components/dashboard/category-limits";
import { DueRecurringCard } from "@/components/dashboard/due-recurring-card";
import { BudgetWidget } from "@/components/dashboard/budget-widget";
import { BudgetSetupDialog } from "@/components/dashboard/budget-setup-dialog";
import { QuickAddForm } from "@/components/dashboard/quick-add-form";
import { UpcomingBillsCard, type UpcomingBill } from "@/components/dashboard/upcoming-bills-card";
import { AnimatedTransactionList } from "@/components/transactions/animated-transaction-list";
import { TransactionDialog } from "@/components/transactions/transaction-dialog";
import { RecurringDialog } from "@/components/settings/recurring-dialog";
import { DynamicGreeting } from "@/components/dashboard/dynamic-greeting";

const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
                       "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function pad(n: number) {
  return String(n).padStart(2, "0");
}

export default async function DashboardPage() {
  const [user, supabase] = await Promise.all([getUser(), createClient()]);

  const fullName = (user?.user_metadata?.full_name as string | undefined) ?? "User";
  const firstName = fullName.split(" ")[0];

  const now = new Date();
  const thisYear = now.getFullYear();
  const thisMonth = now.getMonth() + 1; // 1-12

  // Start of 6-months-ago window
  const windowStart = new Date(now.getFullYear(), now.getMonth() - 5, 1);
  const windowStartStr = `${windowStart.getFullYear()}-${pad(windowStart.getMonth() + 1)}-01`;

  const today = new Date().toISOString().slice(0, 10);

  // End of current month — for upcoming bills query
  const monthEnd = `${thisYear}-${pad(thisMonth)}-${pad(new Date(thisYear, thisMonth, 0).getDate())}`;

  // Days remaining in month (include today, min 1)
  const daysInMonth = new Date(thisYear, thisMonth, 0).getDate();
  const daysRemaining = Math.max(daysInMonth - now.getDate() + 1, 1);

  // Fetch profile, transactions, due recurring items, all categories, upcoming bills in parallel
  // Note: category_limits is stored in profiles (JSONB) — NOT in categories.monthly_limit —
  // so we no longer need a separate limitedCats query.
  const [{ data: profile }, { data: txns }, { data: dueRecurring }, { data: allCats }, { data: upcomingRecurring }] = await Promise.all([
    supabase
      .from("profiles")
      .select("monthly_budget, rollover_enabled, category_limits")
      .eq("id", user!.id)
      .single(),
    supabase
      .from("transactions")
      .select("id, type, amount, date, description, category_id, payment_method, categories(name, color, icon)")
      .eq("user_id", user!.id)
      .gte("date", windowStartStr)
      .order("date", { ascending: false }),
    supabase
      .from("recurring_transactions")
      .select("id, type, description, amount, next_due_date, frequency, categories(name)")
      .eq("user_id", user!.id)
      .eq("is_active", true)
      .lte("next_due_date", today)
      .order("next_due_date"),
    supabase
      .from("categories")
      .select("id, name, type, color, monthly_limit, icon")
      .or(`user_id.eq.${user!.id},user_id.is.null`)
      .order("name"),
    // Upcoming recurring bills later this month (not already due)
    supabase
      .from("recurring_transactions")
      .select("id, type, description, amount, next_due_date, categories(name)")
      .eq("user_id", user!.id)
      .eq("is_active", true)
      .gt("next_due_date", today)
      .lte("next_due_date", monthEnd)
      .order("next_due_date")
      .limit(5),
  ]);

  const allTxns = txns ?? [];

  // ── Current-month stats ──────────────────────────────────────────
  const currentMonthTxns = allTxns.filter((t) => {
    const [y, m] = t.date.split("-");
    return Number(y) === thisYear && Number(m) === thisMonth;
  });

  const monthIncome = currentMonthTxns
    .filter((t) => t.type === "income")
    .reduce((s, t) => s + Number(t.amount), 0);
  const monthExpense = currentMonthTxns
    .filter((t) => t.type === "expense")
    .reduce((s, t) => s + Number(t.amount), 0);
  const monthNet = monthIncome - monthExpense;
  const monthTxnCount = currentMonthTxns.length;

  // ── Previous-month stats (for delta indicators) ───────────────────
  const prevDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const prevYear = prevDate.getFullYear();
  const prevMonth = prevDate.getMonth() + 1;
  const prevMonthTxns = allTxns.filter((t) => {
    const [y, m] = t.date.split("-");
    return Number(y) === prevYear && Number(m) === prevMonth;
  });
  const prevIncome = prevMonthTxns.filter((t) => t.type === "income").reduce((s, t) => s + Number(t.amount), 0);
  const prevExpense = prevMonthTxns.filter((t) => t.type === "expense").reduce((s, t) => s + Number(t.amount), 0);
  const prevNet = prevIncome - prevExpense;
  const prevTxnCount = prevMonthTxns.length;

  // ── Monthly bar chart data (last 6 months) ────────────────────────
  const monthlyData: MonthlyData[] = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1);
    const y = d.getFullYear();
    const m = d.getMonth() + 1;
    const slice = allTxns.filter((t) => {
      const [ty, tm] = t.date.split("-");
      return Number(ty) === y && Number(tm) === m;
    });
    return {
      month: MONTH_LABELS[m - 1],
      income: slice.filter((t) => t.type === "income").reduce((s, t) => s + Number(t.amount), 0),
      expense: slice.filter((t) => t.type === "expense").reduce((s, t) => s + Number(t.amount), 0),
    };
  });

  // ── Category donut (current month expenses) ───────────────────────
  const expenseTxns = currentMonthTxns.filter((t) => t.type === "expense");
  const catMap = new Map<string, { name: string; value: number; color: string; icon: string | null }>();
  for (const t of expenseTxns) {
    const cat = t.categories as unknown as { name: string; color: string | null; icon: string | null } | null;
    const name = cat?.name ?? "Uncategorised";
    const color = cat?.color ?? "#9ca3af";
    const icon = cat?.icon ?? null;
    const existing = catMap.get(name);
    if (existing) {
      existing.value += Number(t.amount);
    } else {
      catMap.set(name, { name, value: Number(t.amount), color, icon });
    }
  }
  const categoryData: CategorySlice[] = Array.from(catMap.values()).sort(
    (a, b) => b.value - a.value,
  );

  // ── Due recurring transactions ────────────────────────────────────
  const dueItems = (dueRecurring ?? []).map((r) => ({
    id: r.id,
    type: r.type as "income" | "expense",
    description: r.description,
    amount: Number(r.amount),
    next_due_date: r.next_due_date,
    frequency: r.frequency,
    category_name: (r.categories as unknown as { name: string } | null)?.name ?? null,
  }));

  // ── Upcoming bills (later this month) ────────────────────────────
  const upcomingItems: UpcomingBill[] = (upcomingRecurring ?? []).map((r) => ({
    id: r.id,
    type: r.type as "income" | "expense",
    description: r.description,
    amount: Number(r.amount),
    next_due_date: r.next_due_date,
    category_name: (r.categories as unknown as { name: string } | null)?.name ?? null,
  }));

  // ── Category spending limits ──────────────────────────────────────
  // Limits now live in profiles.category_limits (JSONB) for per-user isolation.
  const categoryLimits =
    (profile?.category_limits as Record<string, number> | null) ?? {};

  const categoryLimitItems = Object.entries(categoryLimits)
    .filter(([, limit]) => Number(limit) > 0)
    .map(([catId, limit]) => {
      const cat = (allCats ?? []).find((c) => c.id === catId);
      if (!cat) return null;
      const spent = currentMonthTxns
        .filter((t) => t.type === "expense" && t.category_id === catId)
        .reduce((s, t) => s + Number(t.amount), 0);
      return {
        id: catId,
        name: cat.name,
        color: cat.color ?? null,
        icon: cat.icon ?? null,
        monthly_limit: Number(limit),
        spent,
      };
    })
    .filter((item): item is NonNullable<typeof item> => item !== null)
    .sort((a, b) => b.spent / b.monthly_limit - a.spent / a.monthly_limit);

  // ── Recent transactions (last 5) — shaped for AnimatedTransactionList ───────
  const recent = allTxns.slice(0, 5).map((txn) => {
    const cat = txn.categories as unknown as { name: string; color: string | null; icon: string | null } | null;
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
      category_icon: cat?.icon ?? null,
    };
  });

  function delta(current: number, prev: number, lowerIsBetter = false) {
    if (prev === 0) return null;
    const diff = current - prev;
    if (diff === 0) return null;
    const positive = lowerIsBetter ? diff < 0 : diff > 0;
    return {
      label: (diff > 0 ? "+" : "") + formatINR(Math.abs(diff)) + " vs last month",
      up: diff > 0,
      green: positive,
    };
  }

  const summaryCards = [
    {
      label: "Income",
      value: formatINR(monthIncome),
      color: "text-green-600",
      dot: "bg-green-500",
      delta: delta(monthIncome, prevIncome),
    },
    {
      label: "Expenses",
      value: formatINR(monthExpense),
      color: "text-red-600",
      dot: "bg-red-500",
      delta: delta(monthExpense, prevExpense, true),
    },
    {
      label: "Net savings",
      value: (monthNet >= 0 ? "+" : "") + formatINR(monthNet),
      color: monthNet >= 0 ? "text-green-600" : "text-red-600",
      dot: monthNet >= 0 ? "bg-green-500" : "bg-red-500",
      delta: delta(monthNet, prevNet),
    },
    {
      label: "Transactions",
      value: String(monthTxnCount),
      color: "text-gray-900",
      dot: "bg-[#1E6B4E]",
      delta: prevTxnCount > 0 ? {
        label: `${monthTxnCount > prevTxnCount ? "+" : ""}${monthTxnCount - prevTxnCount} vs last month`,
        up: monthTxnCount > prevTxnCount,
        green: null,
      } : null,
    },
  ];

  const currentMonthLabel = `${MONTH_LABELS[thisMonth - 1]} ${thisYear}`;

  return (
    <>
      {/* Sticky action bar */}
      <div className="sticky top-14 md:top-0 z-10 bg-white/95 backdrop-blur-sm border-b border-gray-100 px-6 md:px-8 py-3.5">
        <div className="flex items-center justify-between gap-4">
          <div className="flex-1 min-w-0">
            <DynamicGreeting firstName={firstName} />
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <RecurringDialog categories={allCats ?? []} triggerVariant="secondary" />
            <TransactionDialog categories={allCats ?? []} />
          </div>
        </div>
      </div>

    <main className="px-6 md:px-8 pb-8 pt-6">
      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 mb-6">
        {summaryCards.map((card) => (
          <div
            key={card.label}
            className="rounded-xl border border-gray-100 bg-white p-4"
          >
            <div className="flex items-center gap-2 mb-2">
              <span className={`h-2 w-2 rounded-full ${card.dot}`} />
              <span className="text-xs text-gray-500">{card.label}</span>
            </div>
            <p className={`text-lg font-bold tabular-nums ${card.color}`}>
              {card.value}
            </p>
            {card.delta && (
              <p className={`mt-1 text-xs tabular-nums truncate ${
                card.delta.green === null
                  ? "text-gray-400"
                  : card.delta.green
                    ? "text-green-600"
                    : "text-red-500"
              }`}>
                {card.delta.up ? "↑" : "↓"} {card.delta.label}
              </p>
            )}
          </div>
        ))}
      </div>

      {/* Quick-add expense form */}
      <QuickAddForm categories={allCats ?? []} />

      {/* Budget progress — always visible */}
      {!profile?.monthly_budget ? (
        <div className="rounded-xl border border-dashed border-gray-200 bg-white px-5 py-4 mb-6 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-gray-900">Monthly budget</p>
            <p className="text-xs text-gray-400 mt-0.5">
              Set a limit to track how much you&apos;re spending
            </p>
          </div>
          <BudgetSetupDialog
            categories={allCats ?? []}
            rolloverEnabled={!!profile?.rollover_enabled}
            categoryLimits={categoryLimits}
          />
        </div>
      ) : (() => {
        const baseBudget = Number(profile.monthly_budget);
        const rolloverAmount = profile.rollover_enabled
          ? Math.max(0, baseBudget - prevExpense)
          : 0;
        const budget = baseBudget + rolloverAmount;

        return (
          <BudgetWidget
            monthExpense={monthExpense}
            budget={budget}
            baseBudget={baseBudget}
            rolloverAmount={rolloverAmount}
            daysRemaining={daysRemaining}
            categoryLimitItems={categoryLimitItems}
            categoryLimits={categoryLimits}
            categories={allCats ?? []}
            rolloverEnabled={!!profile.rollover_enabled}
          />
        );
      })()}

      {/* Due recurring transactions */}
      <DueRecurringCard items={dueItems} />

      {/* Category spending limits */}
      <CategoryLimits items={categoryLimitItems} />

      {/* Charts row */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3 mb-6">
        {/* Weekly / Monthly trend toggle — 2/3 width on large screens */}
        <div className="lg:col-span-2">
          <TrendChartCard data={monthlyData} />
        </div>

        {/* Right column — Category donut stacked above Upcoming Bills */}
        <div className="flex flex-col gap-4">
          <div className="rounded-2xl border border-gray-100 bg-white p-5">
            <h2 className="text-sm font-semibold text-gray-900 mb-4">
              Expenses by category
              <span className="ml-1.5 text-xs font-normal text-gray-400">
                ({currentMonthLabel})
              </span>
            </h2>
            <CategoryPieChart data={categoryData} />
          </div>

          {/* Upcoming bills — only rendered when there are items */}
          <UpcomingBillsCard items={upcomingItems} />
        </div>
      </div>

      {/* Recent transactions */}
      <div className="rounded-2xl border border-gray-100 bg-white">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50">
          <h2 className="text-sm font-semibold text-gray-900">
            Recent transactions
          </h2>
          <Link
            href="/transactions"
            className="flex items-center gap-1 text-xs font-medium text-[#1E6B4E] hover:underline"
          >
            View all <ArrowRight className="size-3" />
          </Link>
        </div>
        <AnimatedTransactionList
          transactions={recent}
          categories={allCats ?? []}
        />
      </div>
    </main>
    </>
  );
}
