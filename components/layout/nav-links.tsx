"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Home, ArrowLeftRight, TrendingUp, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV = [
  { label: "Home", href: "/dashboard", icon: Home },
  { label: "Transactions", href: "/transactions", icon: ArrowLeftRight },
  { label: "Insights", href: "/reports", icon: TrendingUp },
  { label: "Settings", href: "/settings", icon: Settings },
];

export function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const router = useRouter();

  // Eagerly prefetch all pages as soon as the nav mounts.
  // With staleTimes.dynamic=30, these payloads stay in the client cache for 30s —
  // clicking any tab is instant even on first visit.
  useEffect(() => {
    NAV.forEach(({ href }) => router.prefetch(href));
  }, [router]);

  return (
    <nav className="flex flex-col gap-0.5">
      {NAV.map(({ label, href, icon: Icon }) => {
        const active =
          pathname === href || pathname.startsWith(href + "/");
        return (
          <Link
            key={href}
            href={href}
            prefetch={true}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-[#1E6B4E]/10 text-[#1E6B4E]"
                : "text-gray-600 hover:bg-gray-100 hover:text-gray-900",
            )}
          >
            <Icon
              className={cn(
                "size-4 shrink-0",
                active ? "text-[#1E6B4E]" : "text-gray-400",
              )}
            />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
