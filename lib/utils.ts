import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Two cached formatters — whole numbers drop decimals, fractional amounts show up to 2 d.p.
// This eliminates "₹500.00" visual noise while preserving "₹500.50" accuracy for paise amounts.
const inrFormatterWhole = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

const inrFormatterDecimal = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatINR(amount: number | string | null | undefined): string {
  if (amount === null || amount === undefined || amount === "") return "₹0";
  const n = typeof amount === "string" ? Number(amount) : amount;
  if (Number.isNaN(n)) return "₹0";
  // Use whole formatter for integers (e.g. ₹500, ₹1,00,000)
  // Use decimal formatter only when paise are present (e.g. ₹500.50)
  return Number.isInteger(n) ? inrFormatterWhole.format(n) : inrFormatterDecimal.format(n);
}
