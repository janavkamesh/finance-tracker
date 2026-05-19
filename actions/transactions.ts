"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { transactionSchema } from "@/lib/validations/transaction";

export async function addTransaction(formData: FormData) {
  const pmRaw = formData.get("payment_method") as string;
  const raw = {
    type: formData.get("type"),
    amount: Number(formData.get("amount")),
    category_id: formData.get("category_id"),
    description: (formData.get("description") as string) || undefined,
    date: formData.get("date"),
    payment_method: pmRaw || undefined,
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
    description: parsed.data.description ?? "",
    notes: null,
  });

  if (error) return { error: error.message };

  revalidatePath("/transactions");
  revalidatePath("/dashboard");
}

export async function updateTransaction(id: string, formData: FormData) {
  const pmRaw = formData.get("payment_method") as string;
  const raw = {
    type: formData.get("type"),
    amount: Number(formData.get("amount")),
    category_id: formData.get("category_id"),
    description: (formData.get("description") as string) || undefined,
    date: formData.get("date"),
    payment_method: pmRaw || undefined,
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
    .update({ ...parsed.data, description: parsed.data.description ?? "", notes: null })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return { error: error.message };

  revalidatePath("/transactions");
  revalidatePath("/dashboard");
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
  revalidatePath("/dashboard");
}

export async function bulkDeleteTransactions(ids: string[]) {
  if (!ids.length) return {};
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase
    .from("transactions")
    .delete()
    .in("id", ids)
    .eq("user_id", user.id);

  if (error) return { error: error.message };

  revalidatePath("/transactions");
  revalidatePath("/dashboard");
  return {};
}

export async function bulkChangeCategory(ids: string[], categoryId: string) {
  if (!ids.length) return {};
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase
    .from("transactions")
    .update({ category_id: categoryId })
    .in("id", ids)
    .eq("user_id", user.id);

  if (error) return { error: error.message };

  revalidatePath("/transactions");
  revalidatePath("/dashboard");
  return {};
}

export async function restoreTransaction(data: {
  type: "income" | "expense";
  amount: number;
  category_id: string;
  description: string;
  date: string;
  payment_method?: string | null;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase.from("transactions").insert({
    user_id: user.id,
    type: data.type,
    amount: data.amount,
    category_id: data.category_id,
    description: data.description,
    date: data.date,
    payment_method: data.payment_method ?? null,
    notes: null,
  });

  if (error) return { error: error.message };

  revalidatePath("/transactions");
  revalidatePath("/dashboard");
}
