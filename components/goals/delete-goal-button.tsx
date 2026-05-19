"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { deleteGoal } from "@/actions/goals";

export function DeleteGoalButton({ id }: { id: string }) {
  const [confirm, setConfirm] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleDelete() {
    if (!confirm) { setConfirm(true); return; }
    setLoading(true);
    const result = await deleteGoal(id);
    setLoading(false);
    if (result?.error) toast.error(result.error);
    else toast.success("Goal deleted");
  }

  return (
    <button
      onClick={handleDelete}
      disabled={loading}
      onBlur={() => setConfirm(false)}
      className={`flex h-7 w-7 items-center justify-center rounded-lg transition-colors ${
        confirm ? "bg-red-100 text-red-600 hover:bg-red-200" : "text-gray-400 hover:bg-gray-100 hover:text-red-500"
      } disabled:opacity-50`}
      aria-label={confirm ? "Confirm delete" : "Delete goal"}
    >
      <Trash2 className="size-3.5" />
    </button>
  );
}
