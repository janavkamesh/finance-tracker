"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { budgetSchema } from "@/lib/validations/settings";

export async function updateBudget(formData: FormData) {
  const raw = { monthly_budget: formData.get("monthly_budget") };
  const parsed = budgetSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const monthlyBudget =
    parsed.data.monthly_budget === 0 ? null : parsed.data.monthly_budget;

  const rolloverEnabled = formData.get("rollover_enabled") === "true";

  const { error } = await supabase
    .from("profiles")
    .update({
      monthly_budget: monthlyBudget,
      rollover_enabled: rolloverEnabled,
      updated_at: new Date().toISOString(),
    })
    .eq("id", user.id);

  if (error) return { error: error.message };
  revalidatePath("/settings");
  revalidatePath("/dashboard");
}

/**
 * Persists per-category spending limits into profiles.category_limits (JSONB).
 *
 * Storing limits here (not on the categories row) avoids the RLS restriction
 * that prevents users from updating system categories (user_id IS NULL).
 * Each user owns their profile row, so the update is always permitted.
 */
export async function saveCategoryLimits(
  updates: { categoryId: string; limit: number | null }[]
): Promise<{ error?: string }> {
  if (updates.length === 0) return {};

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  // Fetch the current JSONB limits so we can merge (not overwrite)
  const { data: profile, error: fetchError } = await supabase
    .from("profiles")
    .select("category_limits")
    .eq("id", user.id)
    .single();

  if (fetchError) return { error: fetchError.message };

  const current: Record<string, number> =
    (profile?.category_limits as Record<string, number>) ?? {};

  const merged = { ...current };
  for (const { categoryId, limit } of updates) {
    if (limit === null || limit === 0) {
      delete merged[categoryId];
    } else {
      merged[categoryId] = limit;
    }
  }

  const { error } = await supabase
    .from("profiles")
    .update({ category_limits: merged, updated_at: new Date().toISOString() })
    .eq("id", user.id);

  if (error) return { error: error.message };

  revalidatePath("/dashboard");
  revalidatePath("/settings");
  return {};
}

/** Wipes all per-category limits for the current user. */
export async function resetBudget(): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase
    .from("profiles")
    .update({
      monthly_budget: null,
      rollover_enabled: false,
      category_limits: {},
      updated_at: new Date().toISOString(),
    })
    .eq("id", user.id);

  if (error) return { error: error.message };

  revalidatePath("/dashboard");
  revalidatePath("/settings");
  return {};
}
