"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { profileSchema, type ProfileInput } from "@/lib/validations/settings";
import { updateProfile } from "@/actions/profile";

export function ProfileForm({ fullName }: { fullName: string }) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<ProfileInput>({
    resolver: zodResolver(profileSchema),
    defaultValues: { full_name: fullName },
  });

  async function onSubmit(data: ProfileInput) {
    const fd = new FormData();
    fd.set("full_name", data.full_name);
    const result = await updateProfile(fd);
    if (result?.error) {
      toast.error(result.error);
    } else {
      toast.success("Profile updated");
    }
  }

  const inputClass =
    "w-full rounded-lg border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1E6B4E]/30 focus:border-[#1E6B4E] transition-colors";

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
      <div className="max-w-sm">
        <label
          htmlFor="full_name"
          className="block text-sm font-medium text-gray-700 mb-1.5"
        >
          Full name
        </label>
        <input
          id="full_name"
          type="text"
          autoComplete="name"
          {...register("full_name")}
          className={inputClass}
        />
        {errors.full_name && (
          <p className="mt-1.5 text-xs text-red-600">{errors.full_name.message}</p>
        )}
      </div>
      <div className="flex justify-end">
        <button
          type="submit"
          disabled={isSubmitting || !isDirty}
          className="rounded-lg bg-[#1E6B4E] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#185c43] disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
        >
          {isSubmitting ? "Saving…" : "Save changes"}
        </button>
      </div>
    </form>
  );
}
