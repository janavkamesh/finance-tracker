"use client";

import { useRouter, usePathname } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";

export function YearSelector({ year }: { year: number }) {
  const router = useRouter();
  const pathname = usePathname();
  const currentYear = new Date().getFullYear();

  function go(y: number) {
    router.replace(`${pathname}?year=${y}`);
  }

  return (
    <div className="flex items-center gap-1">
      <button
        onClick={() => go(year - 1)}
        className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
        aria-label="Previous year"
      >
        <ChevronLeft className="size-4" />
      </button>
      <span className="w-16 text-center text-sm font-semibold text-gray-900">
        {year}
      </span>
      <button
        onClick={() => go(year + 1)}
        disabled={year >= currentYear}
        className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        aria-label="Next year"
      >
        <ChevronRight className="size-4" />
      </button>
    </div>
  );
}
