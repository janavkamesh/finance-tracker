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
import { goalSchema, type GoalInput } from "@/lib/validations/goals";
import { addGoal, updateGoal } from "@/actions/goals";

const PALETTE = [
  "#1E6B4E", "#16A34A", "#2563EB", "#7C3AED",
  "#EC4899", "#F97316", "#D97706", "#DC2626",
  "#0EA5E9", "#10B981", "#64748B", "#9CA3AF",
];

interface Goal {
  id: string;
  name: string;
  target_amount: number;
  target_date: string | null;
  color: string;
}

interface Props {
  goal?: Goal;
}

export function GoalDialog({ goal }: Props) {
  const [open, setOpen] = useState(false);
  const isEdit = !!goal;

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<GoalInput>({
    resolver: zodResolver(goalSchema),
    defaultValues: isEdit
      ? { name: goal.name, target_amount: goal.target_amount, target_date: goal.target_date ?? "", color: goal.color }
      : { name: "", target_amount: undefined, target_date: "", color: PALETTE[0] },
  });

  useEffect(() => {
    if (open && !isEdit) {
      reset({ name: "", target_amount: undefined, target_date: "", color: PALETTE[0] });
    }
  }, [open, isEdit, reset]);

  async function onSubmit(data: GoalInput) {
    const fd = new FormData();
    fd.set("name", data.name);
    fd.set("target_amount", String(data.target_amount));
    fd.set("target_date", data.target_date ?? "");
    if (data.color) fd.set("color", data.color);

    const result = isEdit ? await updateGoal(goal!.id, fd) : await addGoal(fd);

    if (result?.error) toast.error(result.error);
    else {
      toast.success(isEdit ? "Goal updated" : "Goal created");
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
          aria-label="Edit goal"
        >
          <Pencil className="size-3.5" />
        </button>
      ) : (
        <button
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-[#1E6B4E] px-4 py-2 text-sm font-semibold text-white hover:bg-[#185c43] transition-colors"
        >
          <Plus className="size-4" />
          New goal
        </button>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{isEdit ? "Edit Goal" : "Create Goal"}</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4 pt-1">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Goal name</label>
              <input type="text" placeholder="e.g. Emergency fund, Vacation, New phone" {...register("name")} className={inputClass} />
              {errors.name && <p className="mt-1.5 text-xs text-red-600">{errors.name.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Target amount (₹)</label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-gray-400 pointer-events-none">₹</span>
                <input
                  type="text"
                  inputMode="decimal"
                  placeholder="0"
                  {...register("target_amount", {
                    setValueAs: (v) => (v === "" || v == null ? undefined : Number(v)),
                  })}
                  className={`${inputClass} pl-7`}
                />
              </div>
              {errors.target_amount && <p className="mt-1.5 text-xs text-red-600">{errors.target_amount.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Target date <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <Controller
                control={control}
                name="target_date"
                render={({ field }) => (
                  <DatePicker
                    value={field.value ? parse(field.value, "yyyy-MM-dd", new Date()) : null}
                    onChange={(date) => {
                      field.onChange(date ? format(date, "yyyy-MM-dd") : "");
                    }}
                    className={cn(inputClass, "py-2 text-left bg-white")}
                    placeholder="Pick target date"
                  />
                )}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Color</label>
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
                        className={cn("h-7 w-7 rounded-full transition-transform hover:scale-110", field.value === c ? "ring-2 ring-offset-2 ring-gray-400 scale-110" : "")}
                        style={{ backgroundColor: c }}
                        aria-label={c}
                      />
                    ))}
                  </div>
                )}
              />
            </div>

            <div className="flex justify-between pt-1">
              <button type="button" onClick={() => setOpen(false)} className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">Cancel</button>
              <button type="submit" disabled={isSubmitting} className="rounded-lg bg-[#1E6B4E] px-4 py-2 text-sm font-semibold text-white hover:bg-[#185c43] disabled:opacity-60 transition-colors">
                {isSubmitting ? (isEdit ? "Saving…" : "Creating…") : (isEdit ? "Save changes" : "Create goal")}
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
