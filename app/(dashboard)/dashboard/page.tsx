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
      .select("id, type, amount, date, description, category_id, payment_method, categories(name, color, icon, user_id)")
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
      .select("id, name, type, color, monthly_limit, icon, user_id, created_at")
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

  // ── Category donut (current week Sun–Sat expenses) ────────────────
  const weekSunday = new Date(now);
  weekSunday.setDate(now.getDate() - now.getDay());
  const weekSaturday = new Date(weekSunday);
  weekSaturday.setDate(weekSunday.getDate() + 6);
  const weekStart = `${weekSunday.getFullYear()}-${pad(weekSunday.getMonth() + 1)}-${pad(weekSunday.getDate())}`;
  const weekEnd   = `${weekSaturday.getFullYear()}-${pad(weekSaturday.getMonth() + 1)}-${pad(weekSaturday.getDate())}`;

  const weekCatMap = new Map<string, { name: string; value: number; color: string; icon: string | null }>();
  for (const t of allTxns) {
    if (t.type !== "expense" || t.date < weekStart || t.date > weekEnd) continue;
    const cat = t.categories as unknown as { name: string; color: string | null; icon: string | null } | null;
    const name  = cat?.name  ?? "Uncategorised";
    const color = cat?.color ?? "#9ca3af";
    const icon  = cat?.icon  ?? null;
    const existing = weekCatMap.get(name);
    if (existing) existing.value += Number(t.amount);
    else weekCatMap.set(name, { name, value: Number(t.amount), color, icon });
  }
  const weeklyCategoryData: CategorySlice[] = Array.from(weekCatMap.values()).sort(
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
    const cat = txn.categories as unknown as { name: string; color: string | null; icon: string | null; user_id: string | null } | null;
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
      category_user_id: cat?.user_id ?? null,
    };
  });

  // Short, neutral month-over-month delta. Returns a compact INR amount
  // (e.g. "₹10.2K") with no "vs last month" suffix and no green/red intent —
  // these are background context, not a primary signal.
  function compactINR(value: number) {
    const abs = Math.abs(value);
    if (abs >= 10_000_000) return `₹${(value / 10_000_000).toFixed(1)}Cr`;
    if (abs >= 100_000)    return `₹${(value / 100_000).toFixed(1)}L`;
    if (abs >= 1_000)      return `₹${(value / 1_000).toFixed(1)}K`;
    return formatINR(value);
  }

  function delta(current: number, prev: number) {
    if (prev === 0) return null;
    const diff = current - prev;
    if (diff === 0) return null;
    return {
      label: compactINR(Math.abs(diff)),
      up: diff > 0,
    };
  }

  const summaryCards = [
    {
      label: "Income",
      value: formatINR(monthIncome),
      colorVar: "var(--income-color)",
      delta: delta(monthIncome, prevIncome),
    },
    {
      label: "Expenses",
      value: formatINR(monthExpense),
      colorVar: "var(--expense-color)",
      delta: delta(monthExpense, prevExpense),
    },
    {
      label: "Net savings",
      value: (monthNet >= 0 ? "+" : "−") + formatINR(Math.abs(monthNet)),
      colorVar: monthNet >= 0 ? "var(--income-color)" : "var(--expense-color)",
      delta: delta(monthNet, prevNet),
    },
  ];

  const currentMonthLabel = `${MONTH_LABELS[thisMonth - 1]} ${thisYear}`;

  return (
    <>
      {/* Sticky action bar — h-16 matches the sidebar's logo section so the
          bottom borders line up flush across the sidebar/main seam. */}
      <div className="sticky top-14 md:top-0 z-10 h-[88px] px-6 md:px-8 flex items-center justify-between gap-4" style={{ background: 'var(--bg-surface)', borderBottom: '1px solid var(--border-default)' }}>
        <div className="flex-1 min-w-0">
          <DynamicGreeting firstName={firstName} />
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <RecurringDialog categories={allCats ?? []} triggerVariant="secondary" />
          <TransactionDialog categories={allCats ?? []} />
        </div>
      </div>

    <main className="px-6 md:px-8 pb-8 pt-4">
      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        {summaryCards.map((card) => (
          <div
            key={card.label}
            className="rounded-xl px-4 py-3"
            style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', boxShadow: 'var(--card-shadow)' }}
          >
            <div className="flex items-center gap-2 mb-1.5">
              <span className="h-2 w-2 rounded-full" style={{ background: card.colorVar }} />
              <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>{card.label}</span>
            </div>
            <div className="flex items-baseline gap-2">
              <p className="text-lg font-bold tabular-nums" style={{ color: card.colorVar }}>
                {card.value}
              </p>
              {card.delta && (
                <span className="text-[11px] font-medium tabular-nums truncate" style={{ color: 'var(--text-tertiary)' }}>
                  {card.delta.up ? "↑" : "↓"} {card.delta.label}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Quick-add expense form */}
      <QuickAddForm categories={allCats ?? []} />

      {/* Budget progress — always visible */}
      {!profile?.monthly_budget ? (
        <div className="rounded-xl border border-dashed px-5 py-4 mb-4 flex items-center justify-between" style={{ borderColor: 'var(--border-default)', background: 'var(--bg-elevated)' }}>
          <div>
            <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Monthly budget</p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
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

      {/* Charts row */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3 mb-4">
        {/* Weekly / Monthly trend toggle — 2/3 width on large screens */}
        <div className="lg:col-span-2">
          <TrendChartCard data={monthlyData} />
        </div>

        {/* Right column — Category donut stacked above Upcoming Bills */}
        <div className="flex flex-col gap-4">
          <CategoryPieChart data={categoryData} weeklyData={weeklyCategoryData} />

          {/* Upcoming bills — only rendered when there are items */}
          <UpcomingBillsCard items={upcomingItems} />
        </div>
      </div>

      {/* Recent transactions */}
      <div className="rounded-2xl" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', boxShadow: 'var(--card-shadow)' }}>
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid var(--border-default)' }}>
          <h2 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
            Recent transactions
          </h2>
          <Link
            href="/transactions"
            className="flex items-center gap-1 text-xs font-medium hover:underline"
            style={{ color: 'var(--text-brand)' }}
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
