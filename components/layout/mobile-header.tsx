import Link from "next/link";
import { ThemeToggle } from "@/components/ui/theme-toggle";

interface MobileHeaderProps {
  fullName: string;
  userInitials: string;
}

export function MobileHeader({ fullName, userInitials }: MobileHeaderProps) {
  return (
    <header
      className="fixed inset-x-0 top-0 z-30 flex items-center justify-between border-b border-gray-100 dark:border-gray-800 bg-white/95 dark:bg-gray-950/95 backdrop-blur-md px-4 md:hidden"
      style={{
        height: "calc(56px + env(safe-area-inset-top, 0px))",
        paddingTop: "max(0px, env(safe-area-inset-top, 0px))",
      }}
    >
      <div className="flex items-center gap-2">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#1E6B4E]">
          <svg
            className="h-4 w-4 text-white"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>
        <span className="text-sm font-bold text-gray-900 dark:text-gray-100">FinTrack</span>
      </div>

      <div className="flex items-center gap-1">
        <ThemeToggle />
        {/* Avatar → tapping opens Settings */}
        <Link
          href="/settings"
          title={fullName}
          className="flex h-8 w-8 items-center justify-center rounded-full bg-[#1E6B4E]/10 text-xs font-semibold text-[#1E6B4E] hover:bg-[#1E6B4E]/20 transition-colors"
        >
          {userInitials}
        </Link>
      </div>
    </header>
  );
}
