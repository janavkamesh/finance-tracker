import { formatINR } from "@/lib/utils";
import Link from "next/link";

interface LimitItem {
  id: string;
  name: string;
  color: string | null;
  monthly_limit: number;
  spent: number;
}

export function CategoryLimits({ items }: { items: LimitItem[] }) {
  if (items.length === 0) return null;

  return (
    <div className="rounded-xl border border-gray-100 bg-white px-5 py-4 mb-6">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-semibold text-gray-900">Category limits</p>
        <Link
          href="/settings"
          className="text-xs font-medium text-[#1E6B4E] hover:underline"
        >
          Manage
        </Link>
      </div>
      <div className="space-y-3">
        {items.map((item) => {
          const pct = Math.min((item.spent / item.monthly_limit) * 100, 100);
          const over = item.spent > item.monthly_limit;
          const warn = pct >= 80;
          const barColor = over
            ? "bg-red-500"
            : warn
              ? "bg-amber-500"
              : "bg-[#1E6B4E]";
          const textColor = over
            ? "text-red-600"
            : warn
              ? "text-amber-600"
              : "text-gray-400";

          return (
            <div key={item.id}>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span
                    className="h-2 w-2 shrink-0 rounded-full"
                    style={{ backgroundColor: item.color ?? "#9ca3af" }}
                  />
                  <span className="text-xs font-medium text-gray-700 truncate">
                    {item.name}
                  </span>
                  {over && (
                    <span className="shrink-0 rounded-full bg-red-100 px-1.5 py-0.5 text-[10px] font-semibold text-red-600">
                      Over
                    </span>
                  )}
                  {!over && warn && (
                    <span className="shrink-0 rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-600">
                      Near limit
                    </span>
                  )}
                </div>
                <span className={`text-xs tabular-nums shrink-0 ml-2 ${textColor}`}>
                  {formatINR(item.spent)} / {formatINR(item.monthly_limit)}
                </span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-gray-100">
                <div
                  className={`h-1.5 rounded-full transition-all ${barColor}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
