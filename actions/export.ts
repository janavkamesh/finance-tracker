"use server";

import { createClient, getUser } from "@/lib/supabase/server";

export async function exportTransactions(formData: FormData) {
  const supabase = await createClient();
  const user = await getUser();
  if (!user) return { error: "Not authenticated" };

  const search = (formData.get("search") as string) || "";
  const typeFilter = (formData.get("type") as string) || "";
  const period = (formData.get("period") as string) || "";
  const categoryFilter = (formData.get("category") as string) || "";
  // Custom date range (from export dialog)
  const fromDate = (formData.get("fromDate") as string) || "";
  const toDate = (formData.get("toDate") as string) || "";

  let query = supabase
    .from("transactions")
    .select("date, type, amount, description, categories(name)")
    .eq("user_id", user.id)
    .order("date", { ascending: false })
    .order("created_at", { ascending: false });

  if (search) query = query.ilike("description", `%${search}%`);
  if (typeFilter === "income" || typeFilter === "expense")
    query = query.eq("type", typeFilter);
  if (categoryFilter) query = query.eq("category_id", categoryFilter);

  // Custom range takes priority over period
  if (fromDate) {
    query = query.gte("date", fromDate);
    if (toDate) query = query.lte("date", toDate);
  } else if (period === "this_month") {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const last = new Date(y, now.getMonth() + 1, 0).getDate();
    query = query.gte("date", `${y}-${m}-01`).lte("date", `${y}-${m}-${last}`);
  } else if (period === "last_month") {
    const now = new Date();
    const first = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const last = new Date(now.getFullYear(), now.getMonth(), 0);
    const fmt = (d: Date) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    query = query.gte("date", fmt(first)).lte("date", fmt(last));
  } else if (period === "3_months") {
    const now = new Date();
    const first = new Date(now.getFullYear(), now.getMonth() - 2, 1);
    const fmt = (d: Date) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    query = query.gte("date", fmt(first));
  }

  const { data, error } = await query;
  if (error) return { error: error.message };

  const rows = data ?? [];
  const header = ["Date", "Type", "Amount (₹)", "Category", "Description"];
  const lines = rows.map((t) => {
    const cat = t.categories as unknown as { name: string } | null;
    const desc = (t.description || "").replace(/"/g, '""');
    const catName = (cat?.name || "").replace(/"/g, '""');
    return [
      t.date,
      t.type,
      Number(t.amount).toFixed(2),
      `"${catName}"`,
      `"${desc}"`,
    ].join(",");
  });

  const csv = [header.join(","), ...lines].join("\n");
  return { csv };
}
