"use client";

import { useState } from "react";
import { toast } from "sonner";
import { CustomSelect, type SelectOption } from "@/components/ui/custom-select";

const CURRENCY_OPTIONS: SelectOption[] = [
  { label: "₹ INR — Indian Rupee", value: "INR" },
  { label: "$ USD — US Dollar",    value: "USD" },
  { label: "€ EUR — Euro",         value: "EUR" },
  { label: "£ GBP — British Pound", value: "GBP" },
];

const DATE_FORMAT_OPTIONS: SelectOption[] = [
  { label: "DD/MM/YYYY", value: "DD/MM/YYYY" },
  { label: "MM/DD/YYYY", value: "MM/DD/YYYY" },
  { label: "YYYY-MM-DD", value: "YYYY-MM-DD" },
];

export function PreferencesForm() {
  const [currency, setCurrency] = useState("INR");
  const [dateFormat, setDateFormat] = useState("DD/MM/YYYY");
  const [saving, setSaving] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    // Wired up to local state only for now — persistence is a follow-up.
    setTimeout(() => {
      setSaving(false);
      toast.success("Preferences saved");
    }, 250);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 max-w-lg">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Primary Currency
          </label>
          <CustomSelect
            options={CURRENCY_OPTIONS}
            value={currency}
            onChange={setCurrency}
            className="w-full [&>button]:bg-gray-50"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Date Format
          </label>
          <CustomSelect
            options={DATE_FORMAT_OPTIONS}
            value={dateFormat}
            onChange={setDateFormat}
            className="w-full [&>button]:bg-gray-50"
          />
        </div>
      </div>
      <div className="flex justify-end">
        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-[#1E6B4E] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#185c43] disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
        >
          {saving ? "Saving…" : "Save changes"}
        </button>
      </div>
    </form>
  );
}
