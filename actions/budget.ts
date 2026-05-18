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

  const { error } = await supabase
    .from("profiles")
    .update({ monthly_budget: monthlyBudget, updated_at: new Date().toISOString() })
    .eq("id", user.id);

  if (error) return { error: error.message };
  revalidatePath("/settings");
  revalidatePath("/dashboard");
}
