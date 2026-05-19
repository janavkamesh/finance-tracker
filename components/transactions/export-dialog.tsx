"use client";

import { useState } from "react";
import { Download, X } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { exportTransactions } from "@/actions/export";

const MONTHS = [
  { label: "January", value: "01" },
  { label: "February", value: "02" },
  { label: "March", value: "03" },
  { label: "April", value: "04" },
  { label: "May", value: "05" },
  { label: "June", value: "06" },
  { label: "July", value: "07" },
  { label: "August", value: "08" },
  { label: "September", value: "09" },
  { label: "October", value: "10" },
  { label: "November", value: "11" },
  { label: "December", value: "12" },
];

const TYPE_OPTIONS = [
  { label: "All transactions", value: "all" },
  { label: "Income only", value: "income" },
  { label: "Expenses only", value: "expense" },
];

function buildYears(): number[] {
  const current = new Date().getFullYear();
  const years: number[] = [];
  for (let y = current; y >= current - 5; y--) years.push(y);
  return years;
}

const YEARS = buildYears();

export function ExportDialog({
  open: openProp,
  onOpenChange: onOpenChangeProp,
}: {
  open?: boolean;
  onOpenChange?: (v: boolean) => void;
} = {}) {
  const now = new Date();
  const currentMonth = String(now.getMonth() + 1).padStart(2, "0");
  const currentYear = String(now.getFullYear());

  // From: first day of current month
  const [fromMonth, setFromMonth] = useState(currentMonth);
  const [fromYear, setFromYear] = useState(currentYear);
  // To: last day of current month
  const [toMonth, setToMonth] = useState(currentMonth);
  const [toYear, setToYear] = useState(currentYear);
  const [exportType, setExportType] = useState("all");
  const [openState, setOpenState] = useState(false);
  const [loading, setLoading] = useState(false);

  // Support both controlled (open/onOpenChange) and uncontrolled (internal state)
  const isControlled = openProp !== undefined;
  const open = isControlled ? (openProp ?? false) : openState;
  function setOpen(v: boolean) {
    if (isControlled) onOpenChangeProp?.(v);
    else setOpenState(v);
  }

  const fromDate = `${fromYear}-${fromMonth}-01`;
  const toDateLastDay = new Date(Number(toYear), Number(toMonth), 0).getDate();
  const toDate = `${toYear}-${toMonth}-${String(toDateLastDay).padStart(2, "0")}`;

  const fromLabel = `${MONTHS.find((m) => m.value === fromMonth)?.label} ${fromYear}`;
  const toLabel = `${MONTHS.find((m) => m.value === toMonth)?.label} ${toYear}`;

  async function handleExport() {
    setLoading(true);
    const fd = new FormData();
    fd.set("fromDate", fromDate);
    fd.set("toDate", toDate);
    fd.set("type", exportType === "all" ? "" : exportType);
    fd.set("search", "");
    fd.set("category", "");
    fd.set("period", "");

    const result = await exportTransactions(fd);
    setLoading(false);

    if (result?.error) {
      toast.error(result.error);
      return;
    }

    const blob = new Blob([result.csv!], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const slug = exportType === "all" ? "all" : exportType;
    a.href = url;
    a.download = `fintrack-${slug}-${fromYear}${fromMonth}-to-${toYear}${toMonth}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Transactions exported successfully");
    setOpen(false);
  }

  return (
    <>
      {!isControlled && (
        <button
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3.5 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
        >
          <Download className="size-4 shrink-0" />
          Export CSV
        </button>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-sm p-0 gap-0 overflow-hidden">
          <DialogHeader className="px-5 pt-5 pb-4 border-b border-gray-100">
            <DialogTitle className="text-base font-semibold text-gray-900">
              Export Transactions
            </DialogTitle>
            <p className="text-sm text-gray-500 mt-0.5">
              Choose your date range and filters
            </p>
          </DialogHeader>

          <div className="px-5 py-5 space-y-5">
            {/* Date range */}
            <div className="space-y-3">
              <label className="block text-sm font-medium text-gray-700">
                Date range
              </label>

              {/* From */}
              <div>
                <p className="text-xs text-gray-500 mb-1.5">From</p>
                <div className="flex gap-2">
                  <select
                    value={fromMonth}
                    onChange={(e) => setFromMonth(e.target.value)}
                    className="flex-1 h-9 rounded-lg border border-gray-200 bg-gray-50 px-2.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#1E6B4E]/30 focus:border-[#1E6B4E] transition-colors"
                  >
                    {MONTHS.map((m) => (
                      <option key={m.value} value={m.value}>
                        {m.label}
                      </option>
                    ))}
                  </select>
                  <select
                    value={fromYear}
                    onChange={(e) => setFromYear(e.target.value)}
                    className="w-24 h-9 rounded-lg border border-gray-200 bg-gray-50 px-2.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#1E6B4E]/30 focus:border-[#1E6B4E] transition-colors"
                  >
                    {YEARS.map((y) => (
                      <option key={y} value={String(y)}>
                        {y}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* To */}
              <div>
                <p className="text-xs text-gray-500 mb-1.5">To</p>
                <div className="flex gap-2">
                  <select
                    value={toMonth}
                    onChange={(e) => setToMonth(e.target.value)}
                    className="flex-1 h-9 rounded-lg border border-gray-200 bg-gray-50 px-2.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#1E6B4E]/30 focus:border-[#1E6B4E] transition-colors"
                  >
                    {MONTHS.map((m) => (
                      <option key={m.value} value={m.value}>
                        {m.label}
                      </option>
                    ))}
                  </select>
                  <select
                    value={toYear}
                    onChange={(e) => setToYear(e.target.value)}
                    className="w-24 h-9 rounded-lg border border-gray-200 bg-gray-50 px-2.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#1E6B4E]/30 focus:border-[#1E6B4E] transition-colors"
                  >
                    {YEARS.map((y) => (
                      <option key={y} value={String(y)}>
                        {y}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Type filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Transaction type
              </label>
              <div className="flex flex-col gap-1.5">
                {TYPE_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setExportType(opt.value)}
                    className={cn(
                      "flex items-center gap-3 rounded-lg border px-3.5 py-2.5 text-sm text-left transition-colors",
                      exportType === opt.value
                        ? "border-[#1E6B4E] bg-[#1E6B4E]/5 text-[#1E6B4E] font-medium"
                        : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
                    )}
                  >
                    <div
                      className={cn(
                        "h-4 w-4 rounded-full border-2 flex items-center justify-center shrink-0",
                        exportType === opt.value
                          ? "border-[#1E6B4E]"
                          : "border-gray-300"
                      )}
                    >
                      {exportType === opt.value && (
                        <div className="h-2 w-2 rounded-full bg-[#1E6B4E]" />
                      )}
                    </div>
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Preview */}
            <div className="rounded-xl bg-gray-50 border border-gray-100 px-4 py-3">
              <p className="text-xs text-gray-500 mb-1">File preview</p>
              <p className="text-sm font-medium text-gray-800 truncate">
                fintrack-{exportType === "all" ? "all" : exportType}-{fromYear}
                {fromMonth}-to-{toYear}
                {toMonth}.csv
              </p>
              <p className="text-xs text-gray-400 mt-0.5">
                {fromLabel} → {toLabel} · {exportType === "all" ? "All types" : exportType === "income" ? "Income only" : "Expenses only"}
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-between px-5 pb-5">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleExport}
              disabled={loading}
              className="rounded-lg bg-[#1E6B4E] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#185c43] disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <Download className="size-4 shrink-0" />
              {loading ? "Exporting…" : "Export CSV"}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
