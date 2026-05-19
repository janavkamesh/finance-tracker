"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { deleteAccount } from "@/actions/accounts";

export function DeleteAccountButton({ id }: { id: string }) {
  const [confirm, setConfirm] = useState(false);

  function handleDelete() {
    if (!confirm) { setConfirm(true); return; }
    setConfirm(false);
    deleteAccount(id).then((result) => {
      if (result?.error) toast.error(result.error);
      else toast.success("Account removed");
    });
  }

  return (
    <button
      onClick={handleDelete}
      onBlur={() => setConfirm(false)}
      className={`flex h-7 w-7 items-center justify-center rounded-lg transition-colors ${
        confirm ? "bg-red-100 text-red-600 hover:bg-red-200" : "text-gray-400 hover:bg-gray-100 hover:text-red-500"
      }`}
      aria-label={confirm ? "Confirm delete" : "Delete account"}
    >
      <Trash2 className="size-3.5" />
    </button>
  );
}
