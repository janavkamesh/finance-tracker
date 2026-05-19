"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { goalSchema, addSavingsSchema } from "@/lib/validations/goals";

export async function addGoal(formData: FormData) {
  const targetDateRaw = formData.get("target_date") as string;
  const raw = {
    name: formData.get("name"),
    target_amount: Number(formData.get("target_amount")),
    target_date: targetDateRaw || null,
    color: (formData.get("color") as string) || undefined,
  };

  const parsed = goalSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase.from("goals").insert({
    ...parsed.data,
    user_id: user.id,
  });
  if (error) return { error: error.message };

  revalidatePath("/goals");
}

export async function updateGoal(id: string, formData: FormData) {
  const targetDateRaw = formData.get("target_date") as string;
  const raw = {
    name: formData.get("name"),
    target_amount: Number(formData.get("target_amount")),
    target_date: targetDateRaw || null,
    color: (formData.get("color") as string) || undefined,
  };

  const parsed = goalSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase
    .from("goals")
    .update(parsed.data)
    .eq("id", id)
    .eq("user_id", user.id);
  if (error) return { error: error.message };

  revalidatePath("/goals");
}

export async function deleteGoal(id: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase.from("goals").delete().eq("id", id).eq("user_id", user.id);
  if (error) return { error: error.message };

  revalidatePath("/goals");
}

export async function addSavings(id: string, formData: FormData) {
  const parsed = addSavingsSchema.safeParse({ amount: Number(formData.get("amount")) });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { data: goal, error: fetchErr } = await supabase
    .from("goals")
    .select("saved_amount, target_amount")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();
  if (fetchErr || !goal) return { error: "Goal not found" };

  const newSaved = Math.min(
    Number(goal.saved_amount) + parsed.data.amount,
    Number(goal.target_amount)
  );

  const { error } = await supabase
    .from("goals")
    .update({ saved_amount: newSaved })
    .eq("id", id)
    .eq("user_id", user.id);
  if (error) return { error: error.message };

  revalidatePath("/goals");
}
