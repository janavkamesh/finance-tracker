"use server";

import { createClient } from "@/lib/supabase/server";

export interface CalendarTransaction {
  date: string;
  type: "income" | "expense";
  amount: number;
}

export interface DayTransaction {
  description: string | null;
  type: "income" | "expense";
  amount: number;
  category_name: string | null;
  category_color: string | null;
}

export async function getCalendarData(
  year: number,
  month: number
): Promise<CalendarTransaction[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const pad = (n: number) => String(n).padStart(2, "0");
  const start = `${year}-${pad(month)}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const end = `${year}-${pad(month)}-${pad(lastDay)}`;

  const { data } = await supabase
    .from("transactions")
    .select("date, type, amount")
    .eq("user_id", user.id)
    .gte("date", start)
    .lte("date", end);

  return (data ?? []) as CalendarTransaction[];
}

export async function getDayTransactions(date: string): Promise<DayTransaction[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase
    .from("transactions")
    .select("description, type, amount, categories(name, color)")
    .eq("user_id", user.id)
    .eq("date", date)
    .order("created_at", { ascending: false });

  return (data ?? []).map((t: Record<string, unknown>) => {
    const cat = t.categories as { name: string; color: string | null } | null;
    return {
      description: t.description as string | null,
      type: t.type as "income" | "expense",
      amount: Number(t.amount),
      category_name: cat?.name ?? null,
      category_color: cat?.color ?? null,
    };
  });
}
