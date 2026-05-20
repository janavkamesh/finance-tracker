"use client";

import { LogOut } from "lucide-react";
import { signOut } from "@/actions/auth";

export function SignOutButton() {
  return (
    <form action={signOut}>
      <button
        type="submit"
        className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-[rgba(248,113,113,0.08)] hover:text-red-500 dark:hover:text-[#F87171]"
        style={{ color: 'var(--text-tertiary)' }}
      >
        <LogOut className="size-4 shrink-0" style={{ color: 'var(--text-tertiary)' }} />
        Sign out
      </button>
    </form>
  );
}
