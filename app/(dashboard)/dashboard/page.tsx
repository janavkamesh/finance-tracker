import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Dashboard — FinTrack India",
};
import { ArrowRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { formatINR } from "@/lib/utils";
import { MonthlyBarChart, type MonthlyData } from "@/components/dashboard/monthly-bar-chart";
import { CategoryPieChart, type CategorySlice } from "@/components/dashboard/category-pie-chart";

const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
                       "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function pad(n: number) {
  return String(n).padStart(2, "0");
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const now = new Date();
  const thisYear = now.getFullYear();
  const thisMonth = now.getMonth() + 1; // 1-12

  // Start of 6-months-ago window
  const windowStart = new Date(now.getFullYear(), now.getMonth() - 5, 1);
  const windowStartStr = `${windowStart.getFullYear()}-${pad(windowStart.getMonth() + 1)}-01`;

  // Fetch profile (for monthly budget) and transactions in parallel
  const [{ data: profile }, { data: txns }] = await Promise.all([
    supabase
      .from("profiles")
      .select("monthly_budget")
      .eq("id", user!.id)
      .single(),
    supabase
    .from("transactions")
    .select("type, amount, date, description, category_id, categories(name, color)")
    .eq("user_id", user!.id)
    .gte("date", windowStartStr)
    .order("date", { ascending: false }),
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
  const catMap = new Map<string, { name: string; value: number; color: string }>();
  for (const t of expenseTxns) {
    const cat = t.categories as unknown as { name: string; color: string | null } | null;
    const name = cat?.name ?? "Uncategorised";
    const color = cat?.color ?? "#9ca3af";
    const existing = catMap.get(name);
    if (existing) {
      existing.value += Number(t.amount);
    } else {
      catMap.set(name, { name, value: Number(t.amount), color });
    }
  }
  const categoryData: CategorySlice[] = Array.from(catMap.values()).sort(
    (a, b) => b.value - a.value,
  );

  // ── Recent transactions (last 5) ─────────────────────────────────
  const recent = allTxns.slice(0, 5);

  const summaryCards = [
    {
      label: "Income",
      value: formatINR(monthIncome),
      color: "text-green-600",
      bg: "bg-green-50",
      dot: "bg-green-500",
    },
    {
      label: "Expenses",
      value: formatINR(monthExpense),
      color: "text-red-600",
      bg: "bg-red-50",
      dot: "bg-red-500",
    },
    {
      label: "Net savings",
      value: (monthNet >= 0 ? "+" : "") + formatINR(monthNet),
      color: monthNet >= 0 ? "text-green-600" : "text-red-600",
      bg: monthNet >= 0 ? "bg-green-50" : "bg-red-50",
      dot: monthNet >= 0 ? "bg-green-500" : "bg-red-500",
    },
    {
      label: "Transactions",
      value: String(monthTxnCount),
      color: "text-gray-900",
      bg: "bg-gray-50",
      dot: "bg-[#1E6B4E]",
    },
  ];

  const currentMonthLabel = `${MONTH_LABELS[thisMonth - 1]} ${thisYear}`;

  return (
    <main className="p-6 md:p-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-0.5">{currentMonthLabel}</p>
      </div>

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
          </div>
        ))}
      </div>

      {/* Budget progress — only shown when a budget is set */}
      {profile?.monthly_budget && (() => {
        const budget = Number(profile.monthly_budget);
        const pct = Math.min((monthExpense / budget) * 100, 100);
        const remaining = budget - monthExpense;
        const over = monthExpense > budget;
        const barColor = over
          ? "bg-red-500"
          : pct >= 75
            ? "bg-amber-500"
            : "bg-[#1E6B4E]";
        const textColor = over ? "text-red-600" : pct >= 75 ? "text-amber-600" : "text-[#1E6B4E]";

        return (
          <div className="rounded-xl border border-gray-100 bg-white px-5 py-4 mb-6">
            <div className="flex items-center justify-between mb-2.5">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-gray-900">
                  Monthly budget
                </span>
                <span className={`text-xs font-medium tabular-nums ${textColor}`}>
                  {pct.toFixed(0)}% used
                </span>
              </div>
              <span className="text-xs text-gray-500 tabular-nums">
                {formatINR(monthExpense)}{" "}
                <span className="text-gray-400">of {formatINR(budget)}</span>
              </span>
            </div>
            <div className="h-2 w-full rounded-full bg-gray-100">
              <div
                className={`h-2 rounded-full transition-all ${barColor}`}
                style={{ width: `${pct}%` }}
              />
            </div>
            <p className={`mt-1.5 text-xs tabular-nums ${over ? "text-red-600 font-medium" : "text-gray-400"}`}>
              {over
                ? `${formatINR(monthExpense - budget)} over budget`
                : `${formatINR(remaining)} remaining`}
            </p>
          </div>
        );
      })()}

      {/* Charts row */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3 mb-6">
        {/* Monthly trend — 2/3 width on large screens */}
        <div className="lg:col-span-2 rounded-2xl border border-gray-100 bg-white p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">
            Monthly trend
          </h2>
          <MonthlyBarChart data={monthlyData} />
        </div>

        {/* Category breakdown — 1/3 width */}
        <div className="rounded-2xl border border-gray-100 bg-white p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">
            Expenses by category
            <span className="ml-1.5 text-xs font-normal text-gray-400">
              ({currentMonthLabel})
            </span>
          </h2>
          <CategoryPieChart data={categoryData} />
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

        {recent.length === 0 ? (
          <div className="flex items-center justify-center py-12 text-sm text-gray-400">
            No transactions yet — add your first one.
          </div>
        ) : (
          <ul className="divide-y divide-gray-50">
            {recent.map((txn) => {
              const cat = txn.categories as unknown as
                | { name: string; color: string | null }
                | null;
              const isIncome = txn.type === "income";
              return (
                <li
                  key={txn.date + txn.description}
                  className="flex items-center gap-4 px-5 py-3.5"
                >
                  <div
                    className={`h-2 w-2 shrink-0 rounded-full ${isIncome ? "bg-green-500" : "bg-red-500"}`}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {txn.description}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      {cat && (
                        <span
                          className="inline-flex items-center rounded-md px-1.5 py-0.5 text-xs font-medium"
                          style={{
                            backgroundColor: cat.color
                              ? `${cat.color}18`
                              : "#f3f4f6",
                            color: cat.color ?? "#6b7280",
                          }}
                        >
                          {cat.name}
                        </span>
                      )}
                      <span className="text-xs text-gray-400">
                        {new Date(txn.date + "T00:00:00").toLocaleDateString(
                          "en-IN",
                          { day: "numeric", month: "short" },
                        )}
                      </span>
                    </div>
                  </div>
                  <span
                    className={`text-sm font-semibold tabular-nums shrink-0 ${isIncome ? "text-green-600" : "text-red-600"}`}
                  >
                    {isIncome ? "+" : "-"}
                    {formatINR(txn.amount)}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </main>
  );
}
