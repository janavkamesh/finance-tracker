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
}: {
  name: string;
  color: string;
  icon: string;
}): Promise<{
  data?: { id: string; name: string; type: string; color: string; icon: string };
  error?: string;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { data, error } = await supabase
    .from("categories")
    .insert({ name: name.trim(), color, icon, type: "both", user_id: user.id, is_system: false })
    .select("id, name, type, color, icon")
    .single();

  if (error) return { error: error.message };

  revalidatePath("/transactions");
  revalidatePath("/dashboard");
  revalidatePath("/settings");

  return { data };
}
