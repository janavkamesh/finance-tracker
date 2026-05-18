"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { categorySchema } from "@/lib/validations/settings";

export async function addCategory(formData: FormData) {
  const raw = {
    name: formData.get("name"),
    type: formData.get("type"),
    color: formData.get("color") || undefined,
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
  const raw = {
    name: formData.get("name"),
    type: formData.get("type"),
    color: formData.get("color") || undefined,
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
