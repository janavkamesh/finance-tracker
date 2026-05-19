"use client";

import { useState } from "react";
import { Download } from "lucide-react";
import { toast } from "sonner";
import { exportTransactions } from "@/actions/export";

interface Props {
  search: string;
  type: string;
  period: string;
  category: string;
}

export function ExportButton({ search, type, period, category }: Props) {
  const [loading, setLoading] = useState(false);

  async function handleExport() {
    setLoading(true);
    const fd = new FormData();
    fd.set("search", search);
    fd.set("type", type);
    fd.set("period", period);
    fd.set("category", category);

    const result = await exportTransactions(fd);
    setLoading(false);

    if (result?.error) {
      toast.error(result.error);
      return;
    }

    const blob = new Blob([result.csv!], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const now = new Date();
    const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    a.href = url;
    a.download = `fintrack-transactions-${dateStr}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Transactions exported");
  }

  return (
    <button
      onClick={handleExport}
      disabled={loading}
      className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3.5 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-60 disabled:cursor-not-allowed"
    >
      <Download className="size-4 shrink-0" />
      {loading ? "Exporting…" : "Export CSV"}
    </button>
  );
}
