"use client";

import { Download } from "lucide-react";
import { toast } from "sonner";

export function DataExportButton() {
  function handleClick() {
    // Wire-up for CSV generation lands in a follow-up.
    toast("CSV export is coming soon.", {
      description: "We're putting the finishing touches on full-account data export.",
    });
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className="inline-flex items-center gap-2 rounded-lg border border-[#1E6B4E]/25 bg-white px-3.5 py-2 text-sm font-semibold text-[#1E6B4E] shadow-sm transition-all hover:border-[#1E6B4E]/50 hover:bg-[#1E6B4E]/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1E6B4E]/40"
    >
      <Download className="size-4" />
      Export Data as CSV
    </button>
  );
}
