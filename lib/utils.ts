import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

const inrFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

export function formatINR(amount: number | string | null | undefined) {
  if (amount === null || amount === undefined || amount === "") return "₹0";
  const n = typeof amount === "string" ? Number(amount) : amount;
  if (Number.isNaN(n)) return "₹0";
  return inrFormatter.format(n);
}
