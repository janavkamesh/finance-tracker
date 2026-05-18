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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { transactionSchema, type TransactionInput } from "@/lib/validations/transaction";
import { addTransaction, updateTransaction } from "@/actions/transactions";

interface Category {
  id: string;
  name: string;
  type: "income" | "expense" | "both";
  color: string | null;
}

interface Transaction {
  id: string;
  type: "income" | "expense";
  amount: number | string;
  category_id: string;
  description: string;
  date: string;
  notes: string | null;
}

interface Props {
  categories: Category[];
  transaction?: Transaction;
}

function todayLocal() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function TransactionDialog({ categories, transaction }: Props) {
  const [open, setOpen] = useState(false);
  const isEdit = !!transaction;

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<TransactionInput>({
    resolver: zodResolver(transactionSchema),
    defaultValues: isEdit
      ? {
          type: transaction.type,
          amount: Number(transaction.amount),
          category_id: transaction.category_id,
          description: transaction.description,
          date: transaction.date,
          notes: transaction.notes ?? "",
        }
      : {
          type: "expense",
          amount: undefined,
          category_id: "",
          description: "",
          date: todayLocal(),
          notes: "",
        },
  });

  const selectedType = watch("type");

  const filteredCategories = categories.filter(
    (c) => c.type === selectedType || c.type === "both",
  );

  useEffect(() => {
    if (!isEdit) setValue("category_id", "");
  }, [selectedType, isEdit, setValue]);

  useEffect(() => {
    if (open && !isEdit) {
      reset({
        type: "expense",
        amount: undefined,
        category_id: "",
        description: "",
        date: todayLocal(),
        notes: "",
      });
    }
  }, [open, isEdit, reset]);

  async function onSubmit(data: TransactionInput) {
    const fd = new FormData();
    fd.set("type", data.type);
    fd.set("amount", String(data.amount));
    fd.set("category_id", data.category_id);
    fd.set("description", data.description);
    fd.set("date", data.date);
    fd.set("notes", data.notes ?? "");

    const result = isEdit
      ? await updateTransaction(transaction!.id, fd)
      : await addTransaction(fd);

    if (result?.error) {
      toast.error(result.error);
    } else {
      toast.success(isEdit ? "Transaction updated" : "Transaction added");
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
          className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
          aria-label="Edit transaction"
        >
          <Pencil className="size-3.5" />
        </button>
      ) : (
        <button
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-[#1E6B4E] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#185c43] focus:outline-none focus:ring-2 focus:ring-[#1E6B4E]/50"
        >
          <Plus className="size-4" />
          Add Transaction
        </button>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {isEdit ? "Edit Transaction" : "Add Transaction"}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4 pt-1">
            {/* Type toggle */}
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
                        "rounded-lg py-2 text-sm font-medium transition-colors capitalize",
                        field.value === t
                          ? t === "expense"
                            ? "bg-red-100 text-red-700 ring-1 ring-red-200"
                            : "bg-green-100 text-green-700 ring-1 ring-green-200"
                          : "bg-gray-100 text-gray-500 hover:bg-gray-200",
                      )}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              )}
            />

            {/* Amount */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Amount (₹)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                {...register("amount", { valueAsNumber: true })}
                className={inputClass}
              />
              {errors.amount && (
                <p className="mt-1.5 text-xs text-red-600">{errors.amount.message}</p>
              )}
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Description
              </label>
              <input
                type="text"
                placeholder="e.g. Lunch, Salary, Netflix"
                {...register("description")}
                className={inputClass}
              />
              {errors.description && (
                <p className="mt-1.5 text-xs text-red-600">{errors.description.message}</p>
              )}
            </div>

            {/* Category */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Category
              </label>
              <Controller
                control={control}
                name="category_id"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className="w-full h-10 bg-gray-50 border-gray-200">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {filteredCategories.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>
                          {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.category_id && (
                <p className="mt-1.5 text-xs text-red-600">{errors.category_id.message}</p>
              )}
            </div>

            {/* Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Date
              </label>
              <input
                type="date"
                {...register("date")}
                className={inputClass}
              />
              {errors.date && (
                <p className="mt-1.5 text-xs text-red-600">{errors.date.message}</p>
              )}
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Notes{" "}
                <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <textarea
                rows={2}
                placeholder="Any extra detail…"
                {...register("notes")}
                className={cn(inputClass, "resize-none")}
              />
              {errors.notes && (
                <p className="mt-1.5 text-xs text-red-600">{errors.notes.message}</p>
              )}
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-1">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="rounded-lg bg-[#1E6B4E] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#185c43] disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isSubmitting
                  ? isEdit
                    ? "Saving…"
                    : "Adding…"
                  : isEdit
                    ? "Save changes"
                    : "Add transaction"}
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
