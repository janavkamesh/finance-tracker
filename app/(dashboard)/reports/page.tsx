import type { Metadata } from "next";
import { Suspense } from "react";

export const metadata: Metadata = {
  title: "Insights — FinTrack India",
};
import { createClient, getUser } from "@/lib/supabase/server";
import { formatINR } from "@/lib/utils";
import { AreaTrendChart, type MonthPoint } from "@/components/reports/area-trend-chart";
import { YearSelector } from "@/components/reports/year-selector";

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun",
                 "Jul","Aug","Sep","Oct","Nov","Dec"];

function savingsRate(income: number, expense: number) {
  if (income === 0) return null;
  const rate = ((income - expense) / income) * 100;
  return rate.toFixed(0);
}

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const currentYear = new Date().getFullYear();
  const year =
    typeof params.year === "string" &&
    /^\d{4}$/.test(params.year) &&
    Number(params.year) <= currentYear
      ? Number(params.year)
      : currentYear;

  const [user, supabase] = await Promise.all([getUser(), createClient()]);

  const { data: txns } = await supabase
    .from("transactions")
    .select("type, amount, date, category_id, categories(name, color)")
    .eq("user_id", user!.id)
    .gte("date", `${year}-01-01`)
    .lte("date", `${year}-12-31`)
    .order("date");

  const allTxns = txns ?? [];

  // ── Annual totals ──────────────────────────────────────────────────
  const annualIncome = allTxns
    .filter((t) => t.type === "income")
    .reduce((s, t) => s + Number(t.amount), 0);
  const annualExpense = allTxns
    .filter((t) => t.type === "expense")
    .reduce((s, t) => s + Number(t.amount), 0);
  const annualNet = annualIncome - annualExpense;
  const rate = savingsRate(annualIncome, annualExpense);

  // ── Monthly points for area chart ──────────────────────────────────
  const chartData: MonthPoint[] = MONTHS.map((label, i) => {
    const m = i + 1;
    const slice = allTxns.filter((t) => Number(t.date.split("-")[1]) === m);
    return {
      month: label,
      income: slice.filter((t) => t.type === "income").reduce((s, t) => s + Number(t.amount), 0),
      expense: slice.filter((t) => t.type === "expense").reduce((s, t) => s + Number(t.amount), 0),
    };
  });

  // ── Top expense categories for the year ───────────────────────────
  const catMap = new Map<string, { name: string; value: number; color: string }>();
  for (const t of allTxns.filter((t) => t.type === "expense")) {
    const cat = t.categories as unknown as { name: string; color: string | null } | null;
    const name = cat?.name ?? "Uncategorised";
    const color = cat?.color ?? "#9ca3af";
    const existing = catMap.get(name);
    if (existing) existing.value += Number(t.amount);
    else catMap.set(name, { name, value: Number(t.amount), color });
  }
  const topCategories = Array.from(catMap.values())
    .sort((a, b) => b.value - a.value)
    .slice(0, 7);
  const maxCatValue = topCategories[0]?.value ?? 1;

  // ── Monthly table rows ────────────────────────────────────────────
  // Only show months up to today if viewing current year
  const nowMonth = new Date().getMonth() + 1;
  const maxMonth = year === currentYear ? nowMonth : 12;
  const tableRows = chartData.slice(0, maxMonth);

  const summaryCards = [
    { label: "Annual income",   value: formatINR(annualIncome),  color: "text-green-600" },
    { label: "Annual expenses", value: formatINR(annualExpense), color: "text-red-600" },
    { label: "Net savings",
      value: (annualNet >= 0 ? "+" : "") + formatINR(annualNet),
      color: annualNet >= 0 ? "text-green-600" : "text-red-600" },
    { label: "Savings rate",
      value: rate !== null ? `${rate}%` : "—",
      color: rate !== null && Number(rate) >= 0 ? "text-green-600" : "text-red-600" },
  ];

  return (
    <main className="p-6 md:p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Insights</h1>
          <p className="text-sm text-gray-500 mt-0.5">Your annual income, expenses, and savings</p>
        </div>
        <Suspense fallback={null}>
          <YearSelector year={year} />
        </Suspense>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 mb-6">
        {summaryCards.map((c) => (
          <div key={c.label} className="rounded-xl border border-gray-100 bg-white p-4">
            <p className="text-xs text-gray-500 mb-1.5">{c.label}</p>
            <p className={`text-lg font-bold tabular-nums ${c.color}`}>{c.value}</p>
          </div>
        ))}
      </div>

      {/* Dual charts — Income + Expenses side by side */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 mb-5">
        <div className="rounded-2xl border border-gray-100 bg-white p-5">
          <div className="flex items-center gap-2 mb-4">
            <span className="h-2.5 w-2.5 rounded-full bg-green-500 shrink-0" />
            <h2 className="text-sm font-semibold text-gray-900">
              Income — {year}
            </h2>
            <span className="ml-auto text-sm font-bold text-green-600 tabular-nums">
              {formatINR(annualIncome)}
            </span>
          </div>
          <AreaTrendChart data={chartData} type="income" />
        </div>

        <div className="rounded-2xl border border-gray-100 bg-white p-5">
          <div className="flex items-center gap-2 mb-4">
            <span className="h-2.5 w-2.5 rounded-full bg-red-500 shrink-0" />
            <h2 className="text-sm font-semibold text-gray-900">
              Expenses — {year}
            </h2>
            <span className="ml-auto text-sm font-bold text-red-600 tabular-nums">
              {formatINR(annualExpense)}
            </span>
          </div>
          <AreaTrendChart data={chartData} type="expense" />
        </div>
      </div>

      {/* Bottom two-column section */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">

        {/* Monthly breakdown table */}
        <div className="rounded-2xl border border-gray-100 bg-white overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-50">
            <h2 className="text-sm font-semibold text-gray-900">Monthly breakdown</h2>
          </div>
          {tableRows.every((r) => r.income === 0 && r.expense === 0) ? (
            <p className="px-5 py-10 text-center text-sm text-gray-400">
              No data for {year}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-50">
                    <th className="px-5 py-2.5 text-left text-xs font-medium text-gray-400 uppercase tracking-wide">Month</th>
                    <th className="px-4 py-2.5 text-right text-xs font-medium text-gray-400 uppercase tracking-wide">Income</th>
                    <th className="px-4 py-2.5 text-right text-xs font-medium text-gray-400 uppercase tracking-wide">Expenses</th>
                    <th className="px-5 py-2.5 text-right text-xs font-medium text-gray-400 uppercase tracking-wide">Net</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {tableRows.map((row) => {
                    const net = row.income - row.expense;
                    const hasData = row.income > 0 || row.expense > 0;
                    return (
                      <tr
                        key={row.month}
                        className={hasData ? "" : "opacity-35"}
                      >
                        <td className="px-5 py-3 font-medium text-gray-700">
                          {row.month}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums text-green-600">
                          {row.income > 0 ? formatINR(row.income) : "—"}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums text-red-600">
                          {row.expense > 0 ? formatINR(row.expense) : "—"}
                        </td>
                        <td className={`px-5 py-3 text-right tabular-nums font-medium ${net >= 0 ? "text-green-600" : "text-red-600"}`}>
                          {hasData ? ((net >= 0 ? "+" : "") + formatINR(net)) : "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Top categories */}
        <div className="rounded-2xl border border-gray-100 bg-white p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">
            Top expense categories — {year}
          </h2>
          {topCategories.length === 0 ? (
            <p className="text-center py-8 text-sm text-gray-400">
              No expense data for {year}
            </p>
          ) : (
            <ul className="space-y-3.5">
              {topCategories.map((cat, i) => (
                <li key={cat.name}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className="h-2.5 w-2.5 shrink-0 rounded-full"
                        style={{ backgroundColor: cat.color }}
                      />
                      <span className="text-sm text-gray-700 truncate">{cat.name}</span>
                      <span className="text-xs text-gray-400 shrink-0">
                        #{i + 1}
                      </span>
                    </div>
                    <span className="text-sm font-semibold tabular-nums text-gray-900 shrink-0 ml-3">
                      {formatINR(cat.value)}
                    </span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-gray-100">
                    <div
                      className="h-1.5 rounded-full transition-all"
                      style={{
                        width: `${(cat.value / maxCatValue) * 100}%`,
                        backgroundColor: cat.color,
                      }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </main>
  );
}
