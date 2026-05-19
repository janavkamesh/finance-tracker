"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { deleteCategory } from "@/actions/categories";

export function DeleteCategoryButton({ id }: { id: string }) {
  const [confirming, setConfirming] = useState(false);

  function handleDelete() {
    setConfirming(false);
    deleteCategory(id).then((result) => {
      if (result?.error) toast.error(result.error);
      else toast.success("Category deleted");
    });
  }

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
      className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors"
      aria-label="Delete category"
    >
      <Trash2 className="size-3.5" />
    </button>
  );
}
