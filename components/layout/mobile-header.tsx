interface MobileHeaderProps {
  fullName: string;
  userInitials: string;
}

export function MobileHeader({ fullName, userInitials }: MobileHeaderProps) {
  return (
    <header className="fixed inset-x-0 top-0 z-30 flex h-14 items-center justify-between border-b border-gray-100 bg-white px-4 md:hidden">
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
        <span className="text-sm font-bold text-gray-900">FinTrack</span>
      </div>

      {/* User initials avatar */}
      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#1E6B4E]/10 text-xs font-semibold text-[#1E6B4E]">
        {userInitials}
      </div>
    </header>
  );
}
