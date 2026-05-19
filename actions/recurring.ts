"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { recurringSchema } from "@/lib/validations/recurring";

export async function addRecurring(formData: FormData) {
  const raw = {
    type: formData.get("type"),
    amount: Number(formData.get("amount")),
    description: formData.get("description"),
    category_id: formData.get("category_id"),
    frequency: formData.get("frequency"),
    next_due_date: formData.get("next_due_date"),
  };

  const parsed = recurringSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase.from("recurring_transactions").insert({
    ...parsed.data,
    user_id: user.id,
  });
  if (error) return { error: error.message };

  revalidatePath("/settings");
  revalidatePath("/dashboard");
}

export async function updateRecurring(id: string, formData: FormData) {
  const raw = {
    type: formData.get("type"),
    amount: Number(formData.get("amount")),
    description: formData.get("description"),
    category_id: formData.get("category_id"),
    frequency: formData.get("frequency"),
    next_due_date: formData.get("next_due_date"),
  };

  const parsed = recurringSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase
    .from("recurring_transactions")
    .update(parsed.data)
    .eq("id", id)
    .eq("user_id", user.id);
  if (error) return { error: error.message };

  revalidatePath("/settings");
  revalidatePath("/dashboard");
}

export async function deleteRecurring(id: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase
    .from("recurring_transactions")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);
  if (error) return { error: error.message };

  revalidatePath("/settings");
  revalidatePath("/dashboard");
}

function advanceDueDate(date: string, frequency: string): string {
  const d = new Date(date + "T00:00:00");
  if (frequency === "weekly") d.setDate(d.getDate() + 7);
  else if (frequency === "monthly") d.setMonth(d.getMonth() + 1);
  else if (frequency === "yearly") d.setFullYear(d.getFullYear() + 1);
  return d.toISOString().slice(0, 10);
}

export async function logDueRecurring(ids: string[]) {
  if (ids.length === 0) return;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { data: items, error: fetchErr } = await supabase
    .from("recurring_transactions")
    .select("*")
    .in("id", ids)
    .eq("user_id", user.id)
    .eq("is_active", true);

  if (fetchErr) return { error: fetchErr.message };
  if (!items || items.length === 0) return;

  // Insert a real transaction for each recurring item
  const transactions = items.map((r) => ({
    user_id: user.id,
    type: r.type,
    amount: r.amount,
    description: r.description,
    category_id: r.category_id,
    date: r.next_due_date,
  }));

  const { error: insertErr } = await supabase.from("transactions").insert(transactions);
  if (insertErr) return { error: insertErr.message };

  // Advance next_due_date for each logged item
  const updates = items.map((r) =>
    supabase
      .from("recurring_transactions")
      .update({ next_due_date: advanceDueDate(r.next_due_date, r.frequency) })
      .eq("id", r.id)
      .eq("user_id", user.id)
  );
  await Promise.all(updates);

  revalidatePath("/dashboard");
  revalidatePath("/transactions");
  revalidatePath("/settings");
}
