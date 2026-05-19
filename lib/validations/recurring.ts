import { z } from "zod";

export const recurringSchema = z.object({
  type: z.enum(["income", "expense"]),
  amount: z
    .number({ message: "Enter a valid amount" })
    .positive("Amount must be greater than 0")
    .max(10_000_000, "Amount too large"),
  description: z.string().min(1, "Description is required").max(255),
  category_id: z.string().uuid("Please select a category"),
  frequency: z.enum(["weekly", "monthly", "yearly"]),
  next_due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date"),
});

export type RecurringInput = z.infer<typeof recurringSchema>;
