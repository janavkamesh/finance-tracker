"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { transactionSchema } from "@/lib/validations/transaction";

export async function addTransaction(formData: FormData) {
  const raw = {
    type: formData.get("type"),
    amount: formData.get("amount"),
    category_id: formData.get("category_id"),
    description: formData.get("description"),
    date: formData.get("date"),
    notes: formData.get("notes") || undefined,
  };

  const parsed = transactionSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase.from("transactions").insert({
    ...parsed.data,
    user_id: user.id,
    notes: parsed.data.notes ?? null,
  });

  if (error) return { error: error.message };

  revalidatePath("/transactions");
}

export async function updateTransaction(id: string, formData: FormData) {
  const raw = {
    type: formData.get("type"),
    amount: formData.get("amount"),
    category_id: formData.get("category_id"),
    description: formData.get("description"),
    date: formData.get("date"),
    notes: formData.get("notes") || undefined,
  };

  const parsed = transactionSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase
    .from("transactions")
    .update({ ...parsed.data, notes: parsed.data.notes ?? null })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return { error: error.message };

  revalidatePath("/transactions");
}

export async function deleteTransaction(id: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase
    .from("transactions")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return { error: error.message };

  revalidatePath("/transactions");
}
