"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { profileSchema, passwordSchema } from "@/lib/validations/settings";

export async function updateProfile(formData: FormData) {
  const raw = { full_name: formData.get("full_name") };
  const parsed = profileSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const [profileResult, authResult] = await Promise.all([
    supabase
      .from("profiles")
      .update({ full_name: parsed.data.full_name, updated_at: new Date().toISOString() })
      .eq("id", user.id),
    supabase.auth.updateUser({ data: { full_name: parsed.data.full_name } }),
  ]);

  if (profileResult.error) return { error: profileResult.error.message };
  if (authResult.error) return { error: authResult.error.message };

  // Revalidate all dashboard routes so the sidebar name refreshes
  revalidatePath("/dashboard", "layout");
  revalidatePath("/settings");
}

export async function updatePassword(formData: FormData) {
  const raw = {
    new_password: formData.get("new_password"),
    confirm_password: formData.get("confirm_password"),
  };
  const parsed = passwordSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({
    password: parsed.data.new_password,
  });

  if (error) return { error: error.message };
}
