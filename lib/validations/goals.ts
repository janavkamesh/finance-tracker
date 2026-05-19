import { z } from "zod";

export const goalSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Too long"),
  target_amount: z
    .number({ message: "Enter a valid amount" })
    .positive("Target must be greater than 0")
    .max(100_000_000, "Too large"),
  target_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date")
    .optional()
    .nullable(),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, "Invalid color")
    .optional(),
});

export const addSavingsSchema = z.object({
  amount: z
    .number({ message: "Enter a valid amount" })
    .positive("Amount must be greater than 0")
    .max(100_000_000, "Too large"),
});

export type GoalInput = z.infer<typeof goalSchema>;
export type AddSavingsInput = z.infer<typeof addSavingsSchema>;
