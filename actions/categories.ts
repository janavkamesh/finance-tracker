"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { categorySchema } from "@/lib/validations/settings";

export async function addCategory(formData: FormData) {
  const limitRaw = formData.get("monthly_limit");
  const raw = {
    name: formData.get("name"),
    type: formData.get("type"),
    color: formData.get("color") || undefined,
    monthly_limit: limitRaw !== "" && limitRaw !== null ? limitRaw : null,
  };

  const parsed = categorySchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase.from("categories").insert({
    ...parsed.data,
    user_id: user.id,
    is_system: false,
  });

  if (error) return { error: error.message };
  revalidatePath("/settings");
}

export async function updateCategory(id: string, formData: FormData) {
  const limitRaw = formData.get("monthly_limit");
  const raw = {
    name: formData.get("name"),
    type: formData.get("type"),
    color: formData.get("color") || undefined,
    monthly_limit: limitRaw !== "" && limitRaw !== null ? limitRaw : null,
  };

  const parsed = categorySchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase
    .from("categories")
    .update(parsed.data)
    .eq("id", id)
    .eq("user_id", user.id)
    .eq("is_system", false);

  if (error) return { error: error.message };
  revalidatePath("/settings");
  revalidatePath("/transactions");
}

export async function deleteCategory(id: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase
    .from("categories")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id)
    .eq("is_system", false);

  if (error) {
    if (error.code === "23503")
      return { error: "This category is used by existing transactions." };
    return { error: error.message };
  }
  revalidatePath("/settings");
  revalidatePath("/transactions");
}

export async function createCategory({
  name,
  color,
  icon,
  type = "expense",
}: {
  name: string;
  color: string;
  icon: string;
  /** The transaction type context — new categories are strictly siloed,
   *  never "both". Defaults to "expense" as a safe fallback. */
  type?: "income" | "expense";
}): Promise<{
  data?: {
    id: string;
    name: string;
    type: string;
    color: string;
    icon: string;
    user_id: string;
    created_at: string;
  };
  error?: string;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { data, error } = await supabase
    .from("categories")
    .insert({ name: name.trim(), color, icon, type, user_id: user.id, is_system: false })
    .select("id, name, type, color, icon, user_id, created_at")
    .single();

  if (error) return { error: error.message };

  revalidatePath("/transactions");
  revalidatePath("/dashboard");
  revalidatePath("/settings");

  return { data };
}

/**
 * Safely deletes a user-created category.
 *
 * Before deletion, every transaction that references this category is
 * reassigned to the "Other" system category so no transaction is left
 * with an orphaned category_id.
 */
export async function safeDeleteCategory(
  id: string,
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  // 1. Find the "Other" system fallback category
  const { data: otherCat } = await supabase
    .from("categories")
    .select("id")
    .eq("name", "Other")
    .is("user_id", null)
    .maybeSingle();

  // 2. Reassign affected transactions to "Other" (skip if no fallback found)
  if (otherCat) {
    await supabase
      .from("transactions")
      .update({ category_id: otherCat.id })
      .eq("category_id", id)
      .eq("user_id", user.id);
  }

  // 3. Delete the category (only user-owned, non-system rows)
  const { error } = await supabase
    .from("categories")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id)
    .eq("is_system", false);

  if (error) return { error: error.message };

  revalidatePath("/settings");
  revalidatePath("/transactions");
  revalidatePath("/dashboard");
  return {};
}
