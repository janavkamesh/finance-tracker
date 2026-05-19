"use client";

import { useState } from "react";
import { PlusCircle } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { addSavingsSchema, type AddSavingsInput } from "@/lib/validations/goals";
import { addSavings } from "@/actions/goals";

export function AddSavingsDialog({ goalId, goalName }: { goalId: string; goalName: string }) {
  const [open, setOpen] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<AddSavingsInput>({
    resolver: zodResolver(addSavingsSchema),
    defaultValues: { amount: undefined },
  });

  function onSubmit(data: AddSavingsInput) {
    const fd = new FormData();
    fd.set("amount", String(data.amount));
    reset();
    setOpen(false);
    toast.success("Savings added!");
    addSavings(goalId, fd).then((result) => {
      if (result?.error) toast.error(`Failed — ${result.error}`);
    });
  }

  const inputClass =
    "w-full rounded-lg border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1E6B4E]/30 focus:border-[#1E6B4E] transition-colors";

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-lg border border-[#1E6B4E] px-3 py-1.5 text-xs font-semibold text-[#1E6B4E] hover:bg-[#1E6B4E]/5 transition-colors"
      >
        <PlusCircle className="size-3.5" />
        Add savings
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-xs">
          <DialogHeader>
            <DialogTitle>Add savings</DialogTitle>
          </DialogHeader>
          <p className="text-xs text-gray-500 -mt-2">Towards: <span className="font-medium text-gray-700">{goalName}</span></p>

          <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4 pt-1">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Amount (₹)</label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-gray-400 pointer-events-none">₹</span>
                <input
                  type="text"
                  inputMode="decimal"
                  placeholder="0"
                  {...register("amount", {
                    setValueAs: (v) => (v === "" || v == null ? undefined : Number(v)),
                  })}
                  className={`${inputClass} pl-7`}
                />
              </div>
              {errors.amount && <p className="mt-1.5 text-xs text-red-600">{errors.amount.message}</p>}
            </div>

            <div className="flex justify-between">
              <button type="button" onClick={() => setOpen(false)} className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">Cancel</button>
              <button type="submit" className="rounded-lg bg-[#1E6B4E] px-4 py-2 text-sm font-semibold text-white hover:bg-[#185c43] transition-colors">
                Add
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
