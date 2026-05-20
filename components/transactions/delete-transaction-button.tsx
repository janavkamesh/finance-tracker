"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { deleteTransaction } from "@/actions/transactions";

interface Props {
  id: string;
  /** "icon" (default) = compact icon-only row button; "full" = full-width destructive panel button */
  variant?: "icon" | "full";
}

export function DeleteTransactionButton({ id, variant = "icon" }: Props) {
  const [confirming, setConfirming] = useState(false);

  function handleDelete() {
    setConfirming(false);
    deleteTransaction(id).then((result) => {
      if (result?.error) toast.error(result.error);
      else toast.success("Transaction deleted");
    });
  }

  if (variant === "full") {
    if (confirming) {
      return (
        <div className="flex gap-2">
          <button
            onClick={handleDelete}
            className="flex-1 inline-flex items-center justify-center gap-2 h-10 rounded-xl text-sm font-semibold transition-all"
            style={{
              background: 'rgba(239,68,68,0.12)',
              color: 'rgb(239,68,68)',
              border: '1px solid rgba(239,68,68,0.3)',
            }}
          >
            <Trash2 className="size-3.5" />
            Confirm Delete
          </button>
          <button
            onClick={() => setConfirming(false)}
            className="flex-1 inline-flex items-center justify-center gap-2 h-10 rounded-xl text-sm font-semibold transition-all"
            style={{
              background: 'var(--cta-secondary-bg)',
              color: 'var(--cta-secondary-text)',
              border: '1px solid var(--cta-secondary-border)',
            }}
          >
            Cancel
          </button>
        </div>
      );
    }
    return (
      <button
        onClick={() => setConfirming(true)}
        className="w-full inline-flex items-center justify-center gap-2 h-10 rounded-xl text-sm font-semibold transition-all"
        style={{
          background: 'var(--cta-secondary-bg)',
          color: 'rgb(239,68,68)',
          border: '1px solid rgba(239,68,68,0.2)',
        }}
      >
        <Trash2 className="size-3.5" />
        Delete Transaction
      </button>
    );
  }

  // icon variant (default — used in list rows)
  if (confirming) {
    return (
      <div className="flex items-center gap-1">
        <button
          onClick={handleDelete}
          className="rounded px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50 transition-colors"
        >
          Delete
        </button>
        <button
          onClick={() => setConfirming(false)}
          className="rounded px-2 py-1 text-xs font-medium text-gray-500 hover:bg-gray-100 transition-colors"
        >
          Cancel
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => setConfirming(true)}
      className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-red-50 hover:text-red-500"
      aria-label="Delete transaction"
    >
      <Trash2 className="size-3.5" />
    </button>
  );
}
