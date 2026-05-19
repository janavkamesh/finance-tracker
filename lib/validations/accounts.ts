import { z } from "zod";

export const ASSET_TYPES = [
  "savings", "fixed_deposit", "mutual_fund", "stocks", "ppf", "gold", "property", "other_asset",
] as const;

export const LIABILITY_TYPES = [
  "home_loan", "car_loan", "personal_loan", "credit_card", "other_liability",
] as const;

export const ACCOUNT_TYPE_LABELS: Record<string, string> = {
  savings: "Savings Account",
  fixed_deposit: "Fixed Deposit",
  mutual_fund: "Mutual Fund",
  stocks: "Stocks / Equity",
  ppf: "PPF / NPS",
  gold: "Gold",
  property: "Property",
  other_asset: "Other Asset",
  home_loan: "Home Loan",
  car_loan: "Car Loan",
  personal_loan: "Personal Loan",
  credit_card: "Credit Card",
  other_liability: "Other Liability",
};

export const accountSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Too long"),
  type: z.enum([...ASSET_TYPES, ...LIABILITY_TYPES]),
  balance: z
    .number({ message: "Enter a valid amount" })
    .min(0, "Must be 0 or more")
    .max(100_000_000_000, "Too large"),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, "Invalid color")
    .optional(),
});

export type AccountInput = z.infer<typeof accountSchema>;
