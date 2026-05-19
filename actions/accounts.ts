"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { accountSchema } from "@/lib/validations/accounts";

export async function addAccount(formData: FormData) {
  const raw = {
    name: formData.get("name"),
    type: formData.get("type"),
    balance: Number(formData.get("balance")),
    color: (formData.get("color") as string) || undefined,
  };

  const parsed = accountSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase.from("accounts").insert({ ...parsed.data, user_id: user.id });
  if (error) return { error: error.message };

  revalidatePath("/net-worth");
}

export async function updateAccount(id: string, formData: FormData) {
  const raw = {
    name: formData.get("name"),
    type: formData.get("type"),
    balance: Number(formData.get("balance")),
    color: (formData.get("color") as string) || undefined,
  };

  const parsed = accountSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase
    .from("accounts")
    .update({ ...parsed.data, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", user.id);
  if (error) return { error: error.message };

  revalidatePath("/net-worth");
}

export async function deleteAccount(id: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase.from("accounts").delete().eq("id", id).eq("user_id", user.id);
  if (error) return { error: error.message };

  revalidatePath("/net-worth");
}
