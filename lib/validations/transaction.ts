import { z } from "zod";

export const transactionSchema = z.object({
  type: z.enum(["income", "expense"]),
  amount: z
    .number({ message: "Enter a valid amount" })
    .positive("Amount must be greater than 0")
    .max(10_000_000, "Amount is too large"),
  category_id: z.string().uuid("Please select a category"),
  description: z.string().max(255, "Description is too long").optional(),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date"),
  payment_method: z
    .enum(["cash", "upi", "card", "net_banking", "wallet"])
    .optional(),
});

export type TransactionInput = z.infer<typeof transactionSchema>;
