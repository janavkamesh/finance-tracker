"use client";

import { useState, useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { DatePicker } from "@/components/ui/date-picker";
import { parse, format } from "date-fns";
import { toast } from "sonner";
import { Plus, Pencil } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { recurringSchema, type RecurringInput } from "@/lib/validations/recurring";
import { addRecurring, updateRecurring } from "@/actions/recurring";
import { CategoryPicker } from "@/components/transactions/category-picker";

interface Category {
  id: string;
  name: string;
  type: "income" | "expense" | "both";
}

interface Recurring {
  id: string;
  type: "income" | "expense";
  amount: number;
  description: string;
  category_id: string;
  frequency: "weekly" | "monthly" | "yearly";
  next_due_date: string;
}

interface Props {
  categories: Category[];
  recurring?: Recurring;
  triggerVariant?: "primary" | "secondary";
}

function todayLocal() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const FREQUENCY_LABELS = { weekly: "Weekly", monthly: "Monthly", yearly: "Yearly" };

export function RecurringDialog({ categories, recurring, triggerVariant = "primary" }: Props) {
  const [open, setOpen] = useState(false);
  const isEdit = !!recurring;

  const {
    register,
    handleSubmit,
    control,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<RecurringInput>({
    resolver: zodResolver(recurringSchema),
    defaultValues: isEdit
      ? {
          type: recurring.type,
          amount: Number(recurring.amount),
          description: recurring.description,
          category_id: recurring.category_id,
          frequency: recurring.frequency,
          next_due_date: recurring.next_due_date,
        }
      : {
          type: "expense",
          amount: undefined,
          description: "",
          category_id: "",
          frequency: "monthly",
          next_due_date: todayLocal(),
        },
  });

  const selectedType = watch("type");
  const filteredCategories = categories.filter(
    (c) => c.type === selectedType || c.type === "both"
  );

  useEffect(() => {
    if (open && !isEdit) {
      reset({
        type: "expense",
        amount: undefined,
        description: "",
        category_id: "",
        frequency: "monthly",
        next_due_date: todayLocal(),
      });
    }
  }, [open, isEdit, reset]);

  async function onSubmit(data: RecurringInput) {
    const fd = new FormData();
    fd.set("type", data.type);
    fd.set("amount", String(data.amount));
    fd.set("description", data.description);
    fd.set("category_id", data.category_id);
    fd.set("frequency", data.frequency);
    fd.set("next_due_date", data.next_due_date);

    const result = isEdit
      ? await updateRecurring(recurring!.id, fd)
      : await addRecurring(fd);

    if (result?.error) {
      toast.error(result.error);
    } else {
      toast.success(isEdit ? "Updated" : "Recurring transaction added");
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
          aria-label="Edit recurring"
        >
          <Pencil className="size-3.5" />
        </button>
      ) : (
        <button
          onClick={() => setOpen(true)}
          className={cn(
            "inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-semibold transition-colors",
            triggerVariant === "secondary"
              ? "border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-200"
              : "bg-[#1E6B4E] text-white hover:bg-[#185c43] focus:outline-none focus:ring-2 focus:ring-[#1E6B4E]/50"
          )}
        >
          <Plus className="size-4" />
          Add recurring
        </button>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{isEdit ? "Edit Recurring" : "Add Recurring Transaction"}</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4 pt-1">
            {/* Type */}
            <Controller
              control={control}
              name="type"
              render={({ field }) => (
                <div className="grid grid-cols-2 gap-2">
                  {(["expense", "income"] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => field.onChange(t)}
                      className={cn(
                        "rounded-lg py-2 text-sm font-medium capitalize transition-colors",
                        field.value === t
                          ? t === "expense"
                            ? "bg-red-100 text-red-700 ring-1 ring-red-200"
                            : "bg-green-100 text-green-700 ring-1 ring-green-200"
                          : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                      )}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              )}
            />

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Description</label>
              <input
                type="text"
                placeholder="e.g. Rent, Netflix, Salary"
                {...register("description")}
                className={inputClass}
              />
              {errors.description && (
                <p className="mt-1.5 text-xs text-red-600">{errors.description.message}</p>
              )}
            </div>

            {/* Amount */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Amount (₹)</label>
              <input
                type="text"
                inputMode="decimal"
                placeholder="0.00"
                {...register("amount", {
                  setValueAs: (v) => (v === "" || v == null ? undefined : Number(v)),
                })}
                className={inputClass}
              />
              {errors.amount && (
                <p className="mt-1.5 text-xs text-red-600">{errors.amount.message}</p>
              )}
            </div>

            {/* Category */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Category</label>
              <Controller
                control={control}
                name="category_id"
                render={({ field }) => (
                  <CategoryPicker
                    categories={filteredCategories}
                    value={field.value}
                    onChange={field.onChange}
                    error={errors.category_id?.message}
                  />
                )}
              />
              {errors.category_id && (
                <p className="mt-1.5 text-xs text-red-600">{errors.category_id.message}</p>
              )}
            </div>

            {/* Frequency */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Frequency</label>
              <Controller
                control={control}
                name="frequency"
                render={({ field }) => (
                  <div className="grid grid-cols-3 gap-2">
                    {(["weekly", "monthly", "yearly"] as const).map((f) => (
                      <button
                        key={f}
                        type="button"
                        onClick={() => field.onChange(f)}
                        className={cn(
                          "rounded-lg py-2 text-xs font-medium capitalize transition-colors",
                          field.value === f
                            ? "bg-[#1E6B4E]/10 text-[#1E6B4E] ring-1 ring-[#1E6B4E]/20"
                            : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                        )}
                      >
                        {FREQUENCY_LABELS[f]}
                      </button>
                    ))}
                  </div>
                )}
              />
            </div>

            {/* Next due date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                {isEdit ? "Next due date" : "First occurrence"}
              </label>
              <Controller
                control={control}
                name="next_due_date"
                render={({ field }) => (
                  <DatePicker
                    value={field.value ? parse(field.value, "yyyy-MM-dd", new Date()) : null}
                    onChange={(date) => {
                      field.onChange(date ? format(date, "yyyy-MM-dd") : "");
                    }}
                    className={cn(inputClass, "py-2 text-left bg-white")}
                  />
                )}
              />
              {errors.next_due_date && (
                <p className="mt-1.5 text-xs text-red-600">{errors.next_due_date.message}</p>
              )}
            </div>

            <div className="flex justify-between pt-1">
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
                {isSubmitting ? (isEdit ? "Saving…" : "Adding…") : (isEdit ? "Save changes" : "Add recurring")}
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
