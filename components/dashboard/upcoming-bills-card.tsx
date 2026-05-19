import { CalendarClock } from "lucide-react";
import { formatINR } from "@/lib/utils";

export interface UpcomingBill {
  id: string;
  type: "income" | "expense";
  description: string;
  amount: number;
  next_due_date: string;
  category_name: string | null;
}

interface Props {
  items: UpcomingBill[];
}

export function UpcomingBillsCard({ items }: Props) {
  if (items.length === 0) return null;

  // Days until due — relative label
  function dueLabel(dateStr: string): string {
    const due = new Date(dateStr + "T00:00:00");
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diffMs = due.getTime() - today.getTime();
    const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays === 1) return "Tomorrow";
    if (diffDays <= 7) return `In ${diffDays} days`;
    return due.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
  }

  const totalUpcoming = items
    .filter((i) => i.type === "expense")
    .reduce((s, i) => s + i.amount, 0);

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <CalendarClock className="size-4 text-gray-400" />
          <h2 className="text-sm font-semibold text-gray-900">Upcoming bills</h2>
        </div>
        {totalUpcoming > 0 && (
          <span className="text-xs text-gray-400 tabular-nums">
            {formatINR(totalUpcoming)} due
          </span>
        )}
      </div>

      {/* List */}
      <ul className="space-y-2.5">
        {items.map((item) => {
          const isExpense = item.type === "expense";
          const label = dueLabel(item.next_due_date);
          const isUrgent = label === "Tomorrow";

          return (
            <li key={item.id} className="flex items-center gap-3">
              {/* Left urgency indicator */}
              <div
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
                style={{
                  backgroundColor: isExpense ? "#FEF2F218" : "#F0FDF418",
                }}
              >
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: isExpense ? "#EF4444" : "#22C55E" }}
                />
              </div>

              {/* Name + category */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {item.description}
                </p>
                <p className="text-xs mt-0.5">
                  {item.category_name && (
                    <span className="text-gray-400">{item.category_name} · </span>
                  )}
                  <span
                    className={
                      isUrgent ? "font-semibold text-amber-600" : "text-gray-400"
                    }
                  >
                    {label}
                  </span>
                </p>
              </div>

              {/* Amount */}
              <span
                className={`text-sm font-bold tabular-nums shrink-0 ${
                  isExpense ? "text-red-600" : "text-green-600"
                }`}
              >
                {isExpense ? "−" : "+"}{formatINR(item.amount)}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
