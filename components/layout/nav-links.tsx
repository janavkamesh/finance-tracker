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
            style={
              active
                ? { background: 'var(--bg-active-nav)', color: 'var(--text-active-nav)' }
                : undefined
            }
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "font-semibold"
                : "hover:bg-[rgba(22,101,52,0.07)] dark:hover:bg-[rgba(0,185,107,0.08)]",
            )}
            data-nav-inactive={!active ? "true" : undefined}
          >
            <Icon
              className="size-4 shrink-0"
              style={{ color: active ? 'var(--text-brand)' : 'var(--text-tertiary)' }}
            />
            <span style={{ color: active ? undefined : 'var(--text-muted-nav)' }}>{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
