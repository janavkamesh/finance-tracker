"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

const schema = z.object({
  amount: z.coerce.number().positive("Amount must be positive").max(10_000_000, "Amount too large"),
  category_id: z.string().uuid("Invalid category"),
  description: z.string().max(255).optional(),
  payment_method: z
    .enum(["cash", "upi", "card", "net_banking", "wallet"])
    .optional(),
});

export async function quickAddExpense(data: {
  amount: string;
  category_id: string;
  description: string;
  payment_method?: string;
}): Promise<{ error?: string }> {
  const parsed = schema.safeParse(data);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const today = new Date().toISOString().slice(0, 10);

  const { error } = await supabase.from("transactions").insert({
    user_id: user.id,
    type: "expense",
    amount: parsed.data.amount,
    category_id: parsed.data.category_id,
    description: parsed.data.description?.trim() || "Quick expense",
    date: today,
    payment_method: parsed.data.payment_method ?? null,
  });

  if (error) return { error: error.message };

  revalidatePath("/dashboard");
  revalidatePath("/transactions");
  return {};
}
