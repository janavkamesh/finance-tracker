"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { passwordSchema, type PasswordInput } from "@/lib/validations/settings";
import { updatePassword } from "@/actions/profile";

export function PasswordForm() {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<PasswordInput>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { new_password: "", confirm_password: "" },
  });

  async function onSubmit(data: PasswordInput) {
    const fd = new FormData();
    fd.set("new_password", data.new_password);
    fd.set("confirm_password", data.confirm_password);
    const result = await updatePassword(fd);
    if (result?.error) {
      toast.error(result.error);
    } else {
      toast.success("Password changed successfully");
      reset();
    }
  }

  const inputClass =
    "w-full rounded-lg border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1E6B4E]/30 focus:border-[#1E6B4E] transition-colors";

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 max-w-lg">
        <div>
          <label
            htmlFor="new_password"
            className="block text-sm font-medium text-gray-700 mb-1.5"
          >
            New password
          </label>
          <input
            id="new_password"
            type="password"
            autoComplete="new-password"
            placeholder="Min. 6 characters"
            {...register("new_password")}
            className={inputClass}
          />
          {errors.new_password && (
            <p className="mt-1.5 text-xs text-red-600">
              {errors.new_password.message}
            </p>
          )}
        </div>
        <div>
          <label
            htmlFor="confirm_password"
            className="block text-sm font-medium text-gray-700 mb-1.5"
          >
            Confirm password
          </label>
          <input
            id="confirm_password"
            type="password"
            autoComplete="new-password"
            placeholder="Repeat new password"
            {...register("confirm_password")}
            className={inputClass}
          />
          {errors.confirm_password && (
            <p className="mt-1.5 text-xs text-red-600">
              {errors.confirm_password.message}
            </p>
          )}
        </div>
      </div>
      <button
        type="submit"
        disabled={isSubmitting}
        className="rounded-lg bg-[#1E6B4E] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#185c43] disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
      >
        {isSubmitting ? "Changing…" : "Change password"}
      </button>
    </form>
  );
}
