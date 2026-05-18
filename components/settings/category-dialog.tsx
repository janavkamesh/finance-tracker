"use client";

import { useState, useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Plus, Pencil } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { categorySchema, type CategoryInput } from "@/lib/validations/settings";
import { addCategory, updateCategory } from "@/actions/categories";

const PALETTE = [
  "#16A34A", "#DC2626", "#D97706", "#2563EB",
  "#7C3AED", "#EC4899", "#F97316", "#10B981",
  "#0EA5E9", "#64748B", "#1E6B4E", "#9CA3AF",
];

interface Category {
  id: string;
  name: string;
  type: "income" | "expense" | "both";
  color: string | null;
}

interface Props {
  category?: Category;
}

export function CategoryDialog({ category }: Props) {
  const [open, setOpen] = useState(false);
  const isEdit = !!category;

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CategoryInput>({
    resolver: zodResolver(categorySchema),
    defaultValues: isEdit
      ? { name: category.name, type: category.type, color: category.color ?? PALETTE[0] }
      : { name: "", type: "expense", color: PALETTE[0] },
  });

  useEffect(() => {
    if (open && !isEdit) {
      reset({ name: "", type: "expense", color: PALETTE[0] });
    }
  }, [open, isEdit, reset]);

  async function onSubmit(data: CategoryInput) {
    const fd = new FormData();
    fd.set("name", data.name);
    fd.set("type", data.type);
    if (data.color) fd.set("color", data.color);

    const result = isEdit
      ? await updateCategory(category!.id, fd)
      : await addCategory(fd);

    if (result?.error) {
      toast.error(result.error);
    } else {
      toast.success(isEdit ? "Category updated" : "Category added");
      setOpen(false);
    }
  }

  const inputClass =
    "w-full rounded-lg border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1E6B4E]/30 focus:border-[#1E6B4E] transition-colors";

  return (
    <>
      {isEdit ? (
        <button
          onClick={() => setOpen(true)}
          className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
          aria-label="Edit category"
        >
          <Pencil className="size-3.5" />
        </button>
      ) : (
        <button
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-[#1E6B4E] px-3.5 py-2 text-sm font-semibold text-white hover:bg-[#185c43] transition-colors"
        >
          <Plus className="size-4" />
          Add category
        </button>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{isEdit ? "Edit Category" : "Add Category"}</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4 pt-1">
            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Name
              </label>
              <input
                type="text"
                placeholder="e.g. Groceries"
                {...register("name")}
                className={inputClass}
              />
              {errors.name && (
                <p className="mt-1.5 text-xs text-red-600">{errors.name.message}</p>
              )}
            </div>

            {/* Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Type
              </label>
              <Controller
                control={control}
                name="type"
                render={({ field }) => (
                  <div className="grid grid-cols-3 gap-2">
                    {(["expense", "income", "both"] as const).map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => field.onChange(t)}
                        className={cn(
                          "rounded-lg py-2 text-xs font-medium capitalize transition-colors",
                          field.value === t
                            ? t === "income"
                              ? "bg-green-100 text-green-700 ring-1 ring-green-200"
                              : t === "expense"
                                ? "bg-red-100 text-red-700 ring-1 ring-red-200"
                                : "bg-[#1E6B4E]/10 text-[#1E6B4E] ring-1 ring-[#1E6B4E]/20"
                            : "bg-gray-100 text-gray-500 hover:bg-gray-200",
                        )}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                )}
              />
            </div>

            {/* Color */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Color
              </label>
              <Controller
                control={control}
                name="color"
                render={({ field }) => (
                  <div className="flex flex-wrap gap-2">
                    {PALETTE.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => field.onChange(c)}
                        className={cn(
                          "h-7 w-7 rounded-full transition-transform hover:scale-110",
                          field.value === c
                            ? "ring-2 ring-offset-2 ring-gray-400 scale-110"
                            : "",
                        )}
                        style={{ backgroundColor: c }}
                        aria-label={c}
                      />
                    ))}
                  </div>
                )}
              />
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-1">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="rounded-lg bg-[#1E6B4E] px-4 py-2 text-sm font-semibold text-white hover:bg-[#185c43] disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
              >
                {isSubmitting
                  ? isEdit ? "Saving…" : "Adding…"
                  : isEdit ? "Save changes" : "Add category"}
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
