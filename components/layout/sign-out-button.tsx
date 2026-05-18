"use client";

import { LogOut } from "lucide-react";
import { signOut } from "@/actions/auth";

export function SignOutButton() {
  return (
    <form action={signOut}>
      <button
        type="submit"
        className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900"
      >
        <LogOut className="size-4 shrink-0 text-gray-400" />
        Sign out
      </button>
    </form>
  );
}
