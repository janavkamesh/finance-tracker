import { z } from "zod";

export const transactionSchema = z.object({
  type: z.enum(["income", "expense"]),
  amount: z
    .number({ message: "Enter a valid amount" })
    .positive("Amount must be greater than 0")
    .max(10_000_000, "Amount is too large"),
  category_id: z.string().uuid("Please select a category"),
  description: z
    .string()
    .min(1, "Description is required")
    .max(255, "Description is too long"),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date"),
  notes: z.string().max(1000, "Notes too long").optional(),
});

export type TransactionInput = z.infer<typeof transactionSchema>;
