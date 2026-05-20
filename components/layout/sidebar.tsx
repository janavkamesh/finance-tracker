import { NavLinks } from "./nav-links";
import { SignOutButton } from "./sign-out-button";
import { ThemeToggle } from "@/components/ui/theme-toggle";

interface SidebarProps {
  fullName: string;
  userInitials: string;
}

export function Sidebar({ fullName, userInitials }: SidebarProps) {
  return (
    <aside className="flex h-screen w-60 shrink-0 flex-col sticky top-0" style={{ background: 'var(--bg-surface)', borderRight: 'var(--sidebar-border-rule)' }}>
      {/* Brand */}
      <div className="flex h-[88px] items-center gap-2.5 px-4" style={{ borderBottom: '1px solid var(--border-default)' }}>
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#1E6B4E]">
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
        <span className="text-base font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
          FinTrack
        </span>
        <div className="ml-auto">
          <ThemeToggle />
        </div>
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto px-3 py-4">
        <NavLinks />
      </div>

      {/* User + sign out */}
      <div className="space-y-1 px-3 py-3" style={{ borderTop: '1px solid var(--border-default)' }}>
        <div className="flex items-center gap-3 px-3 py-2">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold" style={{ background: 'var(--cta-primary-bg)', color: 'var(--cta-primary-text)' }}>
            {userInitials}
          </div>
          <span className="truncate text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
            {fullName}
          </span>
        </div>
        <SignOutButton />
      </div>
    </aside>
  );
}
