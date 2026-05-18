"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Home, ArrowLeftRight, TrendingUp, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

const TABS = [
  { label: "Home", href: "/dashboard", icon: Home },
  { label: "Transactions", href: "/transactions", icon: ArrowLeftRight },
  { label: "Insights", href: "/reports", icon: TrendingUp },
  { label: "Settings", href: "/settings", icon: Settings },
];

export function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();

  // Eagerly prefetch all pages as soon as the nav mounts.
  // With staleTimes.dynamic=30, these payloads stay in the client cache for 30s —
  // tapping any tab is instant even on first visit.
  useEffect(() => {
    TABS.forEach(({ href }) => router.prefetch(href));
  }, [router]);

  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 flex h-16 items-stretch border-t border-gray-100 bg-white md:hidden">
      {TABS.map(({ label, href, icon: Icon }) => {
        const active = pathname === href || pathname.startsWith(href + "/");
        return (
          <Link
            key={href}
            href={href}
            prefetch={true}
            className={cn(
              "flex flex-1 flex-col items-center justify-center gap-1 text-[10px] font-medium transition-colors",
              active ? "text-[#1E6B4E]" : "text-gray-400 hover:text-gray-600",
            )}
          >
            <Icon
              className={cn(
                "size-5 shrink-0",
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
