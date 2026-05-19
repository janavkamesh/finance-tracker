"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Home, ArrowLeftRight, TrendingUp, Target, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV = [
  { label: "Home",         href: "/dashboard",    icon: Home },
  { label: "Transactions", href: "/transactions", icon: ArrowLeftRight },
  { label: "Goals",        href: "/goals",        icon: Target },
  { label: "Insights",     href: "/reports",      icon: TrendingUp },
  { label: "Settings",     href: "/settings",     icon: Settings },
];

export function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    NAV.forEach(({ href }) => router.prefetch(href));
  }, [router]);

  return (
    <nav className="flex flex-col gap-0.5">
      {NAV.map(({ label, href, icon: Icon }) => {
        const active = pathname === href || pathname.startsWith(href + "/");
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
                : "text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-100",
            )}
          >
            <Icon className={cn("size-4 shrink-0", active ? "text-[#1E6B4E]" : "text-gray-400 dark:text-gray-500")} />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
