"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Home, ArrowLeftRight, Target, TrendingUp, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

const TABS = [
  { label: "Home",     href: "/dashboard",    icon: Home },
  { label: "Txns",     href: "/transactions", icon: ArrowLeftRight },
  { label: "Goals",    href: "/goals",        icon: Target },
  { label: "Insights", href: "/reports",      icon: TrendingUp },
  { label: "Settings", href: "/settings",     icon: Settings },
];

export function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    TABS.forEach(({ href }) => router.prefetch(href));
  }, [router]);

  return (
    <nav
      data-mobile-nav="true"
      className="fixed inset-x-0 bottom-0 z-30 flex items-stretch border-t border-gray-100 bg-white dark:border-gray-800 dark:bg-gray-950 md:hidden"
      style={{ height: "calc(64px + env(safe-area-inset-bottom, 0px))" }}
      aria-label="Main navigation"
    >
      {TABS.map(({ label, href, icon: Icon }) => {
        const active = pathname === href || pathname.startsWith(href + "/");
        return (
          <Link
            key={href}
            href={href}
            prefetch={true}
            aria-label={label}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex flex-1 flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors min-h-[44px]",
              active ? "text-[#1E6B4E] dark:text-emerald-400" : "text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-400",
            )}
          >
            <Icon
              className={cn(
                "size-5 shrink-0 transition-transform duration-150",
                active ? "text-[#1E6B4E] dark:text-emerald-400 scale-110" : "text-gray-400 dark:text-gray-500",
              )}
            />
            <span className={cn("leading-none", active ? "font-semibold" : "font-medium")}>
              {label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
