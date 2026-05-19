"use server";

import { createClient, getUser } from "@/lib/supabase/server";

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

export async function fetchTransactionsBatch({
  search,
  typeFilter,
  categoryFilter,
  period,
  offset,
  limit,
}: {
  search: string;
  typeFilter: string;
  categoryFilter: string;
  period: string;
  offset: number;
  limit: number;
}) {
  const [user, supabase] = await Promise.all([getUser(), createClient()]);
  if (!user) {
    throw new Error("Unauthorized");
  }

  let query = supabase
    .from("transactions")
    .select("*, categories(name, color, type)")
    .eq("user_id", user.id)
    .order("date", { ascending: false })
    .order("created_at", { ascending: false });

  if (search) query = query.ilike("description", `%${search}%`);
  if (typeFilter === "income" || typeFilter === "expense")
    query = query.eq("type", typeFilter);
  if (categoryFilter) query = query.eq("category_id", categoryFilter);

  const dateRange = getDateRange(period);
  if (dateRange?.start) query = query.gte("date", dateRange.start);
  if (dateRange?.end) query = query.lte("date", dateRange.end);

  // Apply pagination
  query = query.range(offset, offset + limit - 1);

  const { data: transactions, error } = await query;
  
  if (error) {
    console.error("Error fetching transactions batch:", error);
    return [];
  }

  return transactions.map((txn: any) => {
    const cat = txn.categories;
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
  });
}
