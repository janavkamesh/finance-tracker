import type { Metadata } from "next";
import { Suspense } from "react";

export const metadata: Metadata = {
  title: "Transactions — FinTrack India",
};
import { createClient } from "@/lib/supabase/server";
import { formatINR } from "@/lib/utils";
import { TransactionDialog } from "@/components/transactions/transaction-dialog";
import { DeleteTransactionButton } from "@/components/transactions/delete-transaction-button";
import { TransactionFilters } from "@/components/transactions/transaction-filters";

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

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

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Categories for filter dropdown + add/edit dialog
  const { data: categories } = await supabase
    .from("categories")
    .select("id, name, type, color")
    .or(`user_id.eq.${user!.id},user_id.is.null`)
    .order("name");

  const cats = categories ?? [];

  // Build transactions query with filters
  let query = supabase
    .from("transactions")
    .select("*, categories(name, color, type)")
    .eq("user_id", user!.id)
    .order("date", { ascending: false })
    .order("created_at", { ascending: false });

  if (search) query = query.ilike("description", `%${search}%`);
  if (typeFilter === "income" || typeFilter === "expense")
    query = query.eq("type", typeFilter);
  if (categoryFilter) query = query.eq("category_id", categoryFilter);

  const dateRange = getDateRange(period);
  if (dateRange?.start) query = query.gte("date", dateRange.start);
  if (dateRange?.end) query = query.lte("date", dateRange.end);

  const { data: transactions } = await query;
  const txns = transactions ?? [];

  // Summary stats from filtered results
  const totalIncome = txns
    .filter((t) => t.type === "income")
    .reduce((sum, t) => sum + Number(t.amount), 0);
  const totalExpense = txns
    .filter((t) => t.type === "expense")
    .reduce((sum, t) => sum + Number(t.amount), 0);
  const net = totalIncome - totalExpense;

  return (
    <main className="p-6 md:p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Transactions</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {txns.length === 0
              ? "No transactions match your filters"
              : `${txns.length} transaction${txns.length !== 1 ? "s" : ""}`}
          </p>
        </div>
        <TransactionDialog categories={cats} />
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        <div className="rounded-xl border border-gray-100 bg-white px-4 py-3">
          <p className="text-xs text-gray-500 mb-1">Income</p>
          <p className="text-base font-semibold text-green-600 tabular-nums">
            {formatINR(totalIncome)}
          </p>
        </div>
        <div className="rounded-xl border border-gray-100 bg-white px-4 py-3">
          <p className="text-xs text-gray-500 mb-1">Expenses</p>
          <p className="text-base font-semibold text-red-600 tabular-nums">
            {formatINR(totalExpense)}
          </p>
        </div>
        <div className="rounded-xl border border-gray-100 bg-white px-4 py-3">
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
      </div>

      {/* Filters — wrapped in Suspense because useSearchParams is used inside */}
      <div className="mb-4">
        <Suspense fallback={null}>
          <TransactionFilters
            categories={cats.map((c) => ({ id: c.id, name: c.name }))}
          />
        </Suspense>
      </div>

      {/* Empty state */}
      {txns.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-white py-16 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 mb-4">
            <svg
              className="h-6 w-6 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z"
              />
            </svg>
          </div>
          <p className="text-sm font-medium text-gray-900">No transactions found</p>
          <p className="text-sm text-gray-500 mt-1">
            Try adjusting your filters or add a new transaction.
          </p>
        </div>
      )}

      {/* Transaction list */}
      {txns.length > 0 && (
        <div className="rounded-2xl border border-gray-100 bg-white overflow-hidden">
          <ul className="divide-y divide-gray-50">
            {txns.map((txn) => {
              const cat = txn.categories as
                | { name: string; color: string | null; type: string }
                | null;
              const isIncome = txn.type === "income";

              return (
                <li
                  key={txn.id}
                  className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50/60 transition-colors group"
                >
                  <div
                    className={`h-2 w-2 shrink-0 rounded-full ${
                      isIncome ? "bg-green-500" : "bg-red-500"
                    }`}
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
                          {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          },
                        )}
                      </span>
                    </div>
                  </div>

                  <span
                    className={`text-sm font-semibold tabular-nums shrink-0 ${
                      isIncome ? "text-green-600" : "text-red-600"
                    }`}
                  >
                    {isIncome ? "+" : "-"}
                    {formatINR(txn.amount)}
                  </span>

                  <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <TransactionDialog
                      categories={cats}
                      transaction={{
                        id: txn.id,
                        type: txn.type as "income" | "expense",
                        amount: txn.amount,
                        category_id: txn.category_id,
                        description: txn.description,
                        date: txn.date,
                        notes: txn.notes,
                      }}
                    />
                    <DeleteTransactionButton id={txn.id} />
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </main>
  );
}
