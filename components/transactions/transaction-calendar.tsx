"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { CalendarDays, ChevronLeft, ChevronRight, ArrowLeft } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getCalendarData, getDayTransactions, type DayTransaction } from "@/actions/calendar";
import { formatINR } from "@/lib/utils";
import { cn } from "@/lib/utils";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const DAYS_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

interface DayData {
  income: number;
  expense: number;
}

function formatCompact(n: number): string {
  if (n >= 100_000) return `${(n / 100_000).toFixed(1)}L`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(Math.round(n));
}

function pad(n: number) {
  return String(n).padStart(2, "0");
}

export function TransactionCalendar({ inline = false }: { inline?: boolean }) {
  const now = new Date();
  const [open, setOpen] = useState(false);
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [dayData, setDayData] = useState<Record<string, DayData>>({});
  const [loading, setLoading] = useState(false);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [dayDetail, setDayDetail] = useState<DayTransaction[]>([]);
  const [dayDetailLoading, setDayDetailLoading] = useState(false);

  // Client-side cache: month key → day data map. Prevents re-fetching visited months.
  const cacheRef = useRef<Map<string, Record<string, DayData>>>(new Map());

  const fetchMonth = useCallback(async (y: number, m: number, updateUI = true) => {
    const key = `${y}-${m}`;
    if (cacheRef.current.has(key)) {
      if (updateUI) setDayData(cacheRef.current.get(key)!);
      return;
    }
    if (updateUI) setLoading(true);
    const rows = await getCalendarData(y, m);
    const grouped: Record<string, DayData> = {};
    rows.forEach((r) => {
      if (!grouped[r.date]) grouped[r.date] = { income: 0, expense: 0 };
      if (r.type === "income") grouped[r.date].income += Number(r.amount);
      else grouped[r.date].expense += Number(r.amount);
    });
    cacheRef.current.set(key, grouped);
    if (updateUI) {
      setDayData(grouped);
      setLoading(false);
    }
  }, []);

  // Fetch current month on open / month change (or immediately when inline)
  useEffect(() => {
    if (!open && !inline) return;
    fetchMonth(year, month);
  }, [open, inline, year, month, fetchMonth]);

  // Silently prefetch adjacent months so navigation feels instant
  useEffect(() => {
    if (!open && !inline) return;
    const prevM = month === 1 ? 12 : month - 1;
    const prevY = month === 1 ? year - 1 : year;
    fetchMonth(prevY, prevM, false);

    const isAtCurrentMonth = year === now.getFullYear() && month === now.getMonth() + 1;
    if (!isAtCurrentMonth) {
      const nextM = month === 12 ? 1 : month + 1;
      const nextY = month === 12 ? year + 1 : year;
      fetchMonth(nextY, nextM, false);
    }
  }, [open, inline, year, month, fetchMonth]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleDayClick(day: number) {
    const dateKey = `${year}-${pad(month)}-${pad(day)}`;
    const info = dayData[dateKey];
    if (!info || (info.income === 0 && info.expense === 0)) return;
    setSelectedDay(dateKey);
    setDayDetail([]);
    setDayDetailLoading(true);
    const txns = await getDayTransactions(dateKey);
    setDayDetail(txns);
    setDayDetailLoading(false);
  }

  function prevMonth() {
    setSelectedDay(null);
    if (month === 1) { setMonth(12); setYear((y) => y - 1); }
    else setMonth((m) => m - 1);
  }

  function nextMonth() {
    const isAtCurrentMonth = year === now.getFullYear() && month === now.getMonth() + 1;
    if (isAtCurrentMonth) return;
    setSelectedDay(null);
    if (month === 12) { setMonth(1); setYear((y) => y + 1); }
    else setMonth((m) => m + 1);
  }

  const isAtCurrentMonth = year === now.getFullYear() && month === now.getMonth() + 1;
  const firstDayOfWeek = new Date(year, month - 1, 1).getDay();
  const daysInMonth = new Date(year, month, 0).getDate();
  const cells: (number | null)[] = [
    ...Array(firstDayOfWeek).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  let monthIncome = 0;
  let monthExpense = 0;
  Object.values(dayData).forEach(({ income, expense }) => {
    monthIncome += income;
    monthExpense += expense;
  });

  // ── Day detail view ──────────────────────────────────────────────────────
  if (selectedDay) {
    const info = dayData[selectedDay] ?? { income: 0, expense: 0 };
    const displayDate = new Date(selectedDay + "T00:00:00").toLocaleDateString("en-IN", {
      weekday: "long", day: "numeric", month: "long", year: "numeric",
    });

    const dayDetailContent = (
      <div className={cn(!inline && "px-5 py-4 overflow-y-auto max-h-[70vh]")}>
        {inline && (
          <div className="flex items-center gap-3 mb-4">
            <button
              onClick={() => setSelectedDay(null)}
              className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
            >
              <ArrowLeft className="size-4" />
            </button>
            <h3 className="text-base font-semibold text-gray-900 leading-tight">
              {displayDate}
            </h3>
          </div>
        )}

        {/* Income / Expense summary cards */}
              <div className={cn("grid gap-3 mb-4", info.income > 0 && info.expense > 0 ? "grid-cols-2" : "grid-cols-1")}>
                {info.income > 0 && (
                  <div className="rounded-xl bg-green-50 border border-green-100 px-4 py-3.5">
                    <p className="text-[10px] text-green-600 font-semibold uppercase tracking-wide mb-1">Income</p>
                    <p className="text-2xl font-bold text-green-700 tabular-nums">{formatINR(info.income)}</p>
                  </div>
                )}
                {info.expense > 0 && (
                  <div className="rounded-xl bg-red-50 border border-red-100 px-4 py-3.5">
                    <p className="text-[10px] text-red-600 font-semibold uppercase tracking-wide mb-1">Expenses</p>
                    <p className="text-2xl font-bold text-red-700 tabular-nums">{formatINR(info.expense)}</p>
                  </div>
                )}
              </div>

              {/* Transaction list */}
              {dayDetailLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-gray-200 border-t-[#1E6B4E]" />
                </div>
              ) : dayDetail.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-4">No transactions found</p>
              ) : (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
                    {dayDetail.length} transaction{dayDetail.length !== 1 ? "s" : ""}
                  </p>
                  {dayDetail.map((txn, i) => (
                    <div key={i} className="flex items-center gap-3 rounded-xl border border-gray-100 bg-white px-3.5 py-3">
                      <div
                        className="h-9 w-9 shrink-0 rounded-lg flex items-center justify-center"
                        style={{
                          backgroundColor: `${txn.category_color ?? (txn.type === "income" ? "#16A34A" : "#DC2626")}18`,
                        }}
                      >
                        <div
                          className="h-2.5 w-2.5 rounded-full"
                          style={{ backgroundColor: txn.category_color ?? (txn.type === "income" ? "#16A34A" : "#DC2626") }}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate">
                          {txn.description || "Untitled"}
                        </p>
                        {txn.category_name && (
                          <p className="text-xs text-gray-400 mt-0.5">{txn.category_name}</p>
                        )}
                      </div>
                      <span className={cn(
                        "text-sm font-bold tabular-nums shrink-0",
                        txn.type === "income" ? "text-green-600" : "text-red-600"
                      )}>
                        {txn.type === "income" ? "+" : "-"}{formatINR(txn.amount)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
    );

    if (inline) {
      return (
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm overflow-hidden min-h-[400px]">
          {dayDetailContent}
        </div>
      );
    }

    return (
      <>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex h-9 items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-[#1E6B4E] hover:border-[#1E6B4E]/40 transition-colors whitespace-nowrap shrink-0"
        >
          <CalendarDays className="size-3.5" />
          Calendar
        </button>

        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setSelectedDay(null); }}>
          <DialogContent className="sm:max-w-lg p-0 gap-0 overflow-hidden">
            <DialogHeader className="px-5 pt-4 pb-0">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setSelectedDay(null)}
                  className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
                >
                  <ArrowLeft className="size-4" />
                </button>
                <DialogTitle className="text-base font-semibold text-gray-900 leading-tight">
                  {displayDate}
                </DialogTitle>
              </div>
            </DialogHeader>
            {dayDetailContent}
          </DialogContent>
        </Dialog>
      </>
    );
  }

  // ── Calendar month view ──────────────────────────────────────────────────
  const monthViewContent = (
    <div className={cn(inline ? "p-5" : "px-5 pb-5 pt-2")}>
      {inline && (
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-base font-semibold text-gray-900">
            Spending Calendar
          </h3>
          <div className="flex items-center gap-1">
            <button
              onClick={prevMonth}
              className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
            >
              <ChevronLeft className="size-4" />
            </button>
            <button
              onClick={() => { setYear(now.getFullYear()); setMonth(now.getMonth() + 1); }}
              className="min-w-[110px] text-center text-sm font-semibold text-gray-800 hover:text-[#1E6B4E] transition-colors px-1 flex items-center justify-center gap-1.5"
            >
              {MONTHS[month - 1]} {year}
              {loading && (
                <span className="h-3 w-3 animate-spin rounded-full border border-gray-300 border-t-[#1E6B4E] inline-block" />
              )}
            </button>
            <button
              onClick={nextMonth}
              disabled={isAtCurrentMonth}
              className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronRight className="size-4" />
            </button>
          </div>
        </div>
      )}

      {/* Monthly summary strip */}
      {!inline && (
        <div className="flex gap-0 mb-3 rounded-xl overflow-hidden border border-gray-100">


            <div className="flex-1 bg-green-50 px-3 py-2 text-center">
              <p className="text-[10px] text-green-600 font-medium uppercase tracking-wide">Income</p>
              <p className="text-sm font-bold text-green-700 tabular-nums">
                ₹{monthIncome.toLocaleString("en-IN")}
              </p>
            </div>
            <div className="w-px bg-gray-100" />
            <div className="flex-1 bg-red-50 px-3 py-2 text-center">
              <p className="text-[10px] text-red-600 font-medium uppercase tracking-wide">Expenses</p>
              <p className="text-sm font-bold text-red-700 tabular-nums">
                ₹{monthExpense.toLocaleString("en-IN")}
              </p>
            </div>
            <div className="w-px bg-gray-100" />
            <div className={cn(
              "flex-1 px-3 py-2 text-center",
              monthIncome - monthExpense >= 0 ? "bg-[#1E6B4E]/5" : "bg-orange-50"
            )}>
              <p className={cn(
                "text-[10px] font-medium uppercase tracking-wide",
                monthIncome - monthExpense >= 0 ? "text-[#1E6B4E]" : "text-orange-600"
              )}>Net</p>
              <p className={cn(
                "text-sm font-bold tabular-nums",
                monthIncome - monthExpense >= 0 ? "text-[#1E6B4E]" : "text-orange-700"
              )}>
                {monthIncome - monthExpense >= 0 ? "+" : ""}₹{Math.abs(monthIncome - monthExpense).toLocaleString("en-IN")}
              </p>
            </div>
          </div>
        )}

      {/* Calendar grid */}
      <div>
        {/* Day headers */}
            <div className="grid grid-cols-7 mb-1">
              {DAYS_SHORT.map((d, i) => (
                <div
                  key={d}
                  className={cn(
                    "text-center text-[10px] font-semibold uppercase tracking-wide py-1",
                    i === 0 ? "text-red-400" : i === 6 ? "text-[#1E6B4E]" : "text-gray-400"
                  )}
                >
                  {d}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-0.5">
              {cells.map((day, idx) => {
                if (!day) {
                  return <div key={`empty-${idx}`} className="aspect-square" />;
                }
                const dateKey = `${year}-${pad(month)}-${pad(day)}`;
                const info = dayData[dateKey];
                const isToday =
                  day === now.getDate() &&
                  month === now.getMonth() + 1 &&
                  year === now.getFullYear();
                const hasExpense = info && info.expense > 0;
                const hasIncome = info && info.income > 0;
                const hasBoth = hasExpense && hasIncome;
                const hasData = hasExpense || hasIncome;
                const net = info ? info.income - info.expense : 0;

                return (
                  <div
                    key={dateKey}
                    onClick={() => handleDayClick(day)}
                    className={cn(
                      "aspect-square flex flex-col items-center justify-center rounded-lg text-center transition-all",
                      hasData ? "cursor-pointer" : "cursor-default",
                      isToday
                        ? "ring-2 ring-[#1E6B4E]"
                        : hasBoth
                          ? "bg-gradient-to-b from-green-50 to-red-50 hover:from-green-100 hover:to-red-100"
                          : hasExpense
                            ? "bg-red-50 hover:bg-red-100"
                            : hasIncome
                              ? "bg-green-50 hover:bg-green-100"
                              : "hover:bg-gray-50"
                    )}
                  >
                    <span
                      className={cn(
                        "text-[11px] font-semibold leading-none",
                        isToday
                          ? "text-[#1E6B4E] font-bold"
                          : idx % 7 === 0
                            ? "text-red-400"
                            : idx % 7 === 6
                              ? "text-[#1E6B4E]"
                              : "text-gray-700"
                      )}
                    >
                      {day}
                    </span>
                    {hasIncome && (
                      <span className="text-[9px] font-bold leading-none mt-0.5 tabular-nums text-green-600">
                        +{formatCompact(info!.income)}
                      </span>
                    )}
                    {hasExpense && (
                      <span className="text-[9px] font-bold leading-none mt-0.5 tabular-nums text-red-500">
                        -{formatCompact(info!.expense)}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>

        {/* Legend */}
        <div className="flex items-center justify-center gap-4 mt-4 pt-4 border-t border-gray-100">
          <div className="flex items-center gap-1.5">
            <div className="h-2.5 w-2.5 rounded bg-green-100 border border-green-200" />
            <span className="text-[10px] text-gray-500">Income</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-2.5 w-2.5 rounded bg-red-100 border border-red-200" />
            <span className="text-[10px] text-gray-500">Expense</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-2.5 w-2.5 rounded border-2 border-[#1E6B4E]" />
            <span className="text-[10px] text-gray-500">Today</span>
          </div>
        </div>
      </div>
    </div>
  );

  if (inline) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden min-h-[400px]">
        {monthViewContent}
      </div>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex h-9 items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-[#1E6B4E] hover:border-[#1E6B4E]/40 transition-colors whitespace-nowrap shrink-0"
      >
        <CalendarDays className="size-3.5" />
        Calendar
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg p-0 gap-0 overflow-hidden">
          <DialogHeader className="px-5 pt-4 pb-0">
            <div className="flex items-center justify-between">
              <DialogTitle className="text-base font-semibold text-gray-900">
                Spending Calendar
              </DialogTitle>
              <div className="flex items-center gap-1">
                <button
                  onClick={prevMonth}
                  className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
                >
                  <ChevronLeft className="size-4" />
                </button>
                <button
                  onClick={() => { setYear(now.getFullYear()); setMonth(now.getMonth() + 1); }}
                  className="min-w-[120px] text-center text-sm font-semibold text-gray-800 hover:text-[#1E6B4E] transition-colors px-2 flex items-center justify-center gap-1.5"
                >
                  {MONTHS[month - 1]} {year}
                  {loading && (
                    <span className="h-3 w-3 animate-spin rounded-full border border-gray-300 border-t-[#1E6B4E] inline-block" />
                  )}
                </button>
                <button
                  onClick={nextMonth}
                  disabled={isAtCurrentMonth}
                  className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <ChevronRight className="size-4" />
                </button>
              </div>
            </div>
          </DialogHeader>
          {monthViewContent}
        </DialogContent>
      </Dialog>
    </>
  );
}
