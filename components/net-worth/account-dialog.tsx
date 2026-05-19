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
  accountSchema,
  type AccountInput,
  ASSET_TYPES,
  LIABILITY_TYPES,
  ACCOUNT_TYPE_LABELS,
} from "@/lib/validations/accounts";
import { addAccount, updateAccount } from "@/actions/accounts";

const PALETTE = [
  "#1E6B4E", "#16A34A", "#2563EB", "#7C3AED",
  "#F97316", "#D97706", "#EC4899", "#DC2626",
  "#0EA5E9", "#10B981", "#64748B", "#9CA3AF",
];

interface Account {
  id: string;
  name: string;
  type: string;
  balance: number;
  color: string;
}

interface Props {
  account?: Account;
}

export function AccountDialog({ account }: Props) {
  const [open, setOpen] = useState(false);
  const isEdit = !!account;

  const {
    register,
    handleSubmit,
    control,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<AccountInput>({
    resolver: zodResolver(accountSchema),
    defaultValues: isEdit
      ? { name: account.name, type: account.type as AccountInput["type"], balance: account.balance, color: account.color }
      : { name: "", type: "savings", balance: undefined, color: PALETTE[0] },
  });

  const selectedType = watch("type");
  const isLiability = (LIABILITY_TYPES as readonly string[]).includes(selectedType);

  useEffect(() => {
    if (open && !isEdit) reset({ name: "", type: "savings", balance: undefined, color: PALETTE[0] });
  }, [open, isEdit, reset]);

  async function onSubmit(data: AccountInput) {
    const fd = new FormData();
    fd.set("name", data.name);
    fd.set("type", data.type);
    fd.set("balance", String(data.balance));
    if (data.color) fd.set("color", data.color);

    const result = isEdit ? await updateAccount(account!.id, fd) : await addAccount(fd);
    if (result?.error) toast.error(result.error);
    else {
      toast.success(isEdit ? "Updated" : "Account added");
      setOpen(false);
    }
  }

  const inputClass =
    "w-full rounded-lg border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1E6B4E]/30 focus:border-[#1E6B4E] transition-colors";

  return (
    <>
      {isEdit ? (
        <button onClick={() => setOpen(true)} className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors" aria-label="Edit account">
          <Pencil className="size-3.5" />
        </button>
      ) : (
        <button onClick={() => setOpen(true)} className="inline-flex items-center gap-2 rounded-lg bg-[#1E6B4E] px-4 py-2 text-sm font-semibold text-white hover:bg-[#185c43] transition-colors">
          <Plus className="size-4" />
          Add account
        </button>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{isEdit ? "Edit Account" : "Add Account"}</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4 pt-1">
            {/* Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Account type</label>
              <div className="grid grid-cols-2 gap-2 mb-2">
                <p className="col-span-2 text-xs font-semibold uppercase tracking-wider text-green-600 mt-1">Assets</p>
                {ASSET_TYPES.map((t) => (
                  <Controller
                    key={t}
                    control={control}
                    name="type"
                    render={({ field }) => (
                      <button type="button" onClick={() => field.onChange(t)}
                        className={cn("rounded-lg py-1.5 px-2 text-xs font-medium text-left transition-colors",
                          field.value === t ? "bg-green-100 text-green-700 ring-1 ring-green-200" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                        )}>
                        {ACCOUNT_TYPE_LABELS[t]}
                      </button>
                    )}
                  />
                ))}
                <p className="col-span-2 text-xs font-semibold uppercase tracking-wider text-red-500 mt-1">Liabilities</p>
                {LIABILITY_TYPES.map((t) => (
                  <Controller
                    key={t}
                    control={control}
                    name="type"
                    render={({ field }) => (
                      <button type="button" onClick={() => field.onChange(t)}
                        className={cn("rounded-lg py-1.5 px-2 text-xs font-medium text-left transition-colors",
                          field.value === t ? "bg-red-100 text-red-700 ring-1 ring-red-200" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                        )}>
                        {ACCOUNT_TYPE_LABELS[t]}
                      </button>
                    )}
                  />
                ))}
              </div>
              {errors.type && <p className="mt-1.5 text-xs text-red-600">{errors.type.message}</p>}
            </div>

            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Account name</label>
              <input type="text" placeholder={isLiability ? "e.g. HDFC Home Loan" : "e.g. HDFC Savings"} {...register("name")} className={inputClass} />
              {errors.name && <p className="mt-1.5 text-xs text-red-600">{errors.name.message}</p>}
            </div>

            {/* Balance */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                {isLiability ? "Outstanding balance (₹)" : "Current value (₹)"}
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-gray-400 pointer-events-none">₹</span>
                <input
                  type="text"
                  inputMode="decimal"
                  placeholder="0"
                  {...register("balance", {
                    setValueAs: (v) => (v === "" || v == null ? undefined : Number(v)),
                  })}
                  className={`${inputClass} pl-7`}
                />
              </div>
              {errors.balance && <p className="mt-1.5 text-xs text-red-600">{errors.balance.message}</p>}
            </div>

            {/* Color */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Color</label>
              <Controller control={control} name="color" render={({ field }) => (
                <div className="flex flex-wrap gap-2">
                  {PALETTE.map((c) => (
                    <button key={c} type="button" onClick={() => field.onChange(c)}
                      className={cn("h-7 w-7 rounded-full transition-transform hover:scale-110", field.value === c ? "ring-2 ring-offset-2 ring-gray-400 scale-110" : "")}
                      style={{ backgroundColor: c }} aria-label={c}
                    />
                  ))}
                </div>
              )} />
            </div>

            <div className="flex justify-end gap-3 pt-1">
              <button type="button" onClick={() => setOpen(false)} className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">Cancel</button>
              <button type="submit" disabled={isSubmitting} className="rounded-lg bg-[#1E6B4E] px-4 py-2 text-sm font-semibold text-white hover:bg-[#185c43] disabled:opacity-60 transition-colors">
                {isSubmitting ? (isEdit ? "Saving…" : "Adding…") : (isEdit ? "Save changes" : "Add account")}
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
