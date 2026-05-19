"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { deleteRecurring } from "@/actions/recurring";

export function DeleteRecurringButton({ id }: { id: string }) {
  const [confirm, setConfirm] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleDelete() {
    if (!confirm) { setConfirm(true); return; }
    setLoading(true);
    const result = await deleteRecurring(id);
    setLoading(false);
    if (result?.error) toast.error(result.error);
    else toast.success("Deleted");
  }

  return (
    <button
      onClick={handleDelete}
      disabled={loading}
      className={`flex h-7 w-7 items-center justify-center rounded-lg transition-colors ${
        confirm
          ? "bg-red-100 text-red-600 hover:bg-red-200"
          : "text-gray-400 hover:bg-gray-100 hover:text-red-500"
      } disabled:opacity-50`}
      aria-label={confirm ? "Confirm delete" : "Delete recurring"}
      onBlur={() => setConfirm(false)}
    >
      <Trash2 className="size-3.5" />
    </button>
  );
}
