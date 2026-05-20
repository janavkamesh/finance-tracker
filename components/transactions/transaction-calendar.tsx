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

export function TransactionCalendar({
  inline = false,
  initialDayData,
}: {
  inline?: boolean;
  initialDayData?: Record<string, DayData>;
}) {
  const now = new Date();
  const [open, setOpen] = useState(false);
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [dayData, setDayData] = useState<Record<string, DayData>>(
    initialDayData ?? {}
  );
  const [loading, setLoading] = useState(false);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [dayDetail, setDayDetail] = useState<DayTransaction[]>([]);
  const [dayDetailLoading, setDayDetailLoading] = useState(false);

  // Client-side cache: month key → day data map
  const cacheRef = useRef<Map<string, Record<string, DayData>>>(new Map());
  // Client-side cache: date key → day transactions (populated on hover or click)
  const dayDetailCacheRef = useRef<Map<string, DayTransaction[]>>(new Map());

  // ── Seed cache from pre-computed props — eliminates the network fetch on
  //    initial mount when the parent already has this month's transactions loaded.
  useEffect(() => {
    if (!initialDayData) return;
    const key = `${now.getFullYear()}-${now.getMonth() + 1}`;
    cacheRef.current.set(key, initialDayData);
    // Immediately apply if currently viewing the current month
    if (year === now.getFullYear() && month === now.getMonth() + 1) {
      setDayData(initialDayData);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialDayData]);

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

  // Shared fetcher with client-side cache — used for both hover prefetch and click
  const fetchDayDetail = useCallback(async (dateKey: string): Promise<DayTransaction[]> => {
    if (dayDetailCacheRef.current.has(dateKey)) {
      return dayDetailCacheRef.current.get(dateKey)!;
    }
    const txns = await getDayTransactions(dateKey);
    dayDetailCacheRef.current.set(dateKey, txns);
    return txns;
  }, []);

  useEffect(() => {
    if (!open && !inline) return;
    fetchMonth(year, month);
  }, [open, inline, year, month, fetchMonth]);

  // Silently prefetch adjacent months for instant navigation
  useEffect(() => {
    if (!open && !inline) return;
    const prevM = month === 1 ? 12 : month - 1;
    const prevY = month === 1 ? year - 1 : year;
    fetchMonth(prevY, prevM, false);
    const isAtCurrent = year === now.getFullYear() && month === now.getMonth() + 1;
    if (!isAtCurrent) {
      const nextM = month === 12 ? 1 : month + 1;
      const nextY = month === 12 ? year + 1 : year;
      fetchMonth(nextY, nextM, false);
    }
  }, [open, inline, year, month, fetchMonth]); // eslint-disable-line react-hooks/exhaustive-deps

  // Hover prefetch — start fetching day transactions before the user clicks
  function handleDayHover(day: number) {
    const dateKey = `${year}-${pad(month)}-${pad(day)}`;
    const info = dayData[dateKey];
    if (info && (info.income > 0 || info.expense > 0) && !dayDetailCacheRef.current.has(dateKey)) {
      fetchDayDetail(dateKey); // fire-and-forget; populates cache
    }
  }

  async function handleDayClick(day: number) {
    const dateKey = `${year}-${pad(month)}-${pad(day)}`;
    const info = dayData[dateKey];
    const hasData = info && (info.income > 0 || info.expense > 0);

    // Show panel immediately — no waiting
    setSelectedDay(dateKey);
    setDayDetail([]);

    if (!hasData) {
      // Empty day — no fetch needed, show empty state instantly
      setDayDetailLoading(false);
      return;
    }

    // Check cache first (may have been populated by hover prefetch)
    if (dayDetailCacheRef.current.has(dateKey)) {
      setDayDetail(dayDetailCacheRef.current.get(dateKey)!);
      setDayDetailLoading(false);
      return;
    }

    setDayDetailLoading(true);
    const txns = await fetchDayDetail(dateKey);
    setDayDetail(txns);
    setDayDetailLoading(false);
  }

  function prevMonth() {
    setSelectedDay(null);
    if (month === 1) { setMonth(12); setYear((y) => y - 1); }
    else setMonth((m) => m - 1);
  }

  function nextMonth() {
    const isAtCurrent = year === now.getFullYear() && month === now.getMonth() + 1;
    if (isAtCurrent) return;
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

  // ── Day detail panel ──────────────────────────────────────────────────────
  if (selectedDay) {
    const info = dayData[selectedDay] ?? { income: 0, expense: 0 };
    const hasData = info.income > 0 || info.expense > 0;
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
            <h3 className="text-base font-semibold text-gray-900 leading-tight">{displayDate}</h3>
          </div>
        )}

        {hasData ? (
          <>
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
                      style={{ backgroundColor: `${txn.category_color ?? (txn.type === "income" ? "#16A34A" : "#DC2626")}18` }}
                    >
                      <div
                        className="h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: txn.category_color ?? (txn.type === "income" ? "#16A34A" : "#DC2626") }}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">{txn.description || "Untitled"}</p>
                      {txn.category_name && (
                        <p className="text-xs text-gray-400 mt-0.5">{txn.category_name}</p>
                      )}
                    </div>
                    <span className={cn("text-sm font-bold tabular-nums shrink-0", txn.type === "income" ? "text-green-600" : "text-red-600")}>
                      {txn.type === "income" ? "+" : "-"}{formatINR(txn.amount)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </>
        ) : (
          /* Empty day — instant, no fetch */
          <div className="flex flex-col items-center justify-center py-14 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 mb-4">
              <CalendarDays className="h-6 w-6 text-gray-300" />
            </div>
            <p className="text-sm font-semibold text-gray-500">No transactions</p>
            <p className="text-xs text-gray-400 mt-1">Nothing logged on this day</p>
          </div>
        )}
      </div>
    );

    if (inline) {
      return (
        <div
          className="w-full rounded-2xl overflow-hidden"
          style={{
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border-default)',
            boxShadow: 'var(--card-shadow)',
          }}
        >
          <div className="p-5">{dayDetailContent}</div>
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

  // ── Calendar month view ───────────────────────────────────────────────────
  const calendarNav = (
    <div className="flex items-center gap-1">
      <button
        onClick={prevMonth}
        className="flex h-7 w-7 items-center justify-center rounded-lg transition-colors hover:bg-[rgba(0,0,0,0.05)] dark:hover:bg-[rgba(255,255,255,0.06)]"
        style={{ color: 'var(--text-secondary)' }}
      >
        <ChevronLeft className="size-4" />
      </button>
      <button
        onClick={() => { setYear(now.getFullYear()); setMonth(now.getMonth() + 1); }}
        className="min-w-[120px] text-center text-sm font-semibold transition-colors px-2 flex items-center justify-center gap-1.5"
        style={{ color: 'var(--text-primary)' }}
      >
        {MONTHS[month - 1]} {year}
        {loading && (
          <span className="h-3 w-3 animate-spin rounded-full border border-gray-300 border-t-[#1E6B4E] inline-block" />
        )}
      </button>
      <button
        onClick={nextMonth}
        disabled={isAtCurrentMonth}
        className="flex h-7 w-7 items-center justify-center rounded-lg transition-colors hover:bg-[rgba(0,0,0,0.05)] dark:hover:bg-[rgba(255,255,255,0.06)] disabled:opacity-30 disabled:cursor-not-allowed"
        style={{ color: 'var(--text-secondary)' }}
      >
        <ChevronRight className="size-4" />
      </button>
    </div>
  );

  const monthViewContent = (
    <div className={cn(inline ? "p-5" : "px-5 pb-5 pt-2")}>
      {inline && (
        <div
          className="flex items-center justify-between mb-5 pb-3.5"
          style={{ borderBottom: '1px solid var(--border-default)' }}
        >
          <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Spending Calendar</h3>
          {calendarNav}
        </div>
      )}

      {/* Monthly summary strip — dialog only */}
      {!inline && (
        <div className="flex gap-0 mb-3 rounded-xl overflow-hidden border border-gray-100">
          <div className="flex-1 bg-green-50 px-3 py-2 text-center">
            <p className="text-[10px] text-green-600 font-medium uppercase tracking-wide">Income</p>
            <p className="text-sm font-bold text-green-700 tabular-nums">₹{monthIncome.toLocaleString("en-IN")}</p>
          </div>
          <div className="w-px bg-gray-100" />
          <div className="flex-1 bg-red-50 px-3 py-2 text-center">
            <p className="text-[10px] text-red-600 font-medium uppercase tracking-wide">Expenses</p>
            <p className="text-sm font-bold text-red-700 tabular-nums">₹{monthExpense.toLocaleString("en-IN")}</p>
          </div>
          <div className="w-px bg-gray-100" />
          <div className={cn("flex-1 px-3 py-2 text-center", monthIncome - monthExpense >= 0 ? "bg-[#1E6B4E]/5" : "bg-orange-50")}>
            <p className={cn("text-[10px] font-medium uppercase tracking-wide", monthIncome - monthExpense >= 0 ? "text-[#1E6B4E]" : "text-orange-600")}>Net</p>
            <p className={cn("text-sm font-bold tabular-nums", monthIncome - monthExpense >= 0 ? "text-[#1E6B4E]" : "text-orange-700")}>
              {monthIncome - monthExpense >= 0 ? "+" : ""}₹{Math.abs(monthIncome - monthExpense).toLocaleString("en-IN")}
            </p>
          </div>
        </div>
      )}

      {/* ── Calendar grid ─────────────────────────────────────────────── */}
      <div className="rounded-xl border border-gray-100 overflow-hidden">
        {/* Day-of-week header row */}
        <div className="grid grid-cols-7 bg-gray-50 border-b border-gray-100">
          {DAYS_SHORT.map((d, i) => (
            <div
              key={d}
              className={cn(
                "py-2 text-center text-[10px] font-semibold uppercase tracking-wide border-r border-gray-100 last:border-r-0",
                i === 0 ? "text-red-400" : i === 6 ? "text-[#1E6B4E]" : "text-gray-400"
              )}
            >
              {d}
            </div>
          ))}
        </div>

        {/* Date cells */}
        <div className="grid grid-cols-7">
          {cells.map((day, idx) => {
            const isLastRow = idx >= cells.length - 7;
            const isSunday = idx % 7 === 0;
            const isSaturday = idx % 7 === 6;

            if (!day) {
              return (
                <div
                  key={`empty-${idx}`}
                  className={cn(
                    "min-h-[76px] border-r border-b border-gray-100 bg-gray-50/40",
                    isSaturday && "border-r-0",
                    isLastRow && "border-b-0"
                  )}
                />
              );
            }

            const dateKey = `${year}-${pad(month)}-${pad(day)}`;
            const info = dayData[dateKey];
            const isToday =
              day === now.getDate() &&
              month === now.getMonth() + 1 &&
              year === now.getFullYear();
            const hasExpense = !!(info && info.expense > 0);
            const hasIncome = !!(info && info.income > 0);
            const hasBoth = hasExpense && hasIncome;
            const hasData = hasExpense || hasIncome;

            return (
              <div
                key={dateKey}
                onClick={() => handleDayClick(day)}
                onMouseEnter={() => handleDayHover(day)}
                className={cn(
                  "relative min-h-[76px] flex flex-col p-2 cursor-pointer transition-colors border-r border-b border-gray-100",
                  isSaturday && "border-r-0",
                  isLastRow && "border-b-0",
                  isToday
                    ? "bg-[#1E6B4E]/[0.04]"
                    : hasBoth
                      ? "hover:bg-gray-50/80"
                      : hasExpense
                        ? "bg-red-50/30 hover:bg-red-50/60"
                        : hasIncome
                          ? "bg-green-50/30 hover:bg-green-50/60"
                          : "hover:bg-gray-50/60"
                )}
              >
                {/* Today indicator — ring inset */}
                {isToday && (
                  <div className="absolute inset-0 ring-inset ring-1 ring-[#1E6B4E]/25 pointer-events-none rounded-none" />
                )}

                {/* Date number — top-left */}
                <span
                  className={cn(
                    "inline-flex h-6 w-6 items-center justify-center rounded-full text-sm font-semibold leading-none self-start shrink-0",
                    isToday
                      ? "bg-[#1E6B4E] text-white text-xs font-bold"
                      : isSunday
                        ? "text-red-400"
                        : isSaturday
                          ? "text-[#1E6B4E]"
                          : "text-gray-700"
                  )}
                >
                  {day}
                </span>

                {/* Amounts — centered in remaining cell height */}
                {hasData && (
                  <div className="flex-1 flex flex-col items-center justify-center gap-0.5">
                    {hasIncome && (
                      <span className="text-[10px] font-bold leading-none tabular-nums text-green-600">
                        +{formatCompact(info!.income)}
                      </span>
                    )}
                    {hasExpense && (
                      <span className="text-[10px] font-bold leading-none tabular-nums text-red-500">
                        -{formatCompact(info!.expense)}
                      </span>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-5 mt-3">
        <div className="flex items-center gap-1.5">
          <div className="h-2.5 w-2.5 rounded-sm bg-green-100 border border-green-200" />
          <span className="text-[10px] text-gray-400">Income</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-2.5 w-2.5 rounded-sm bg-red-100 border border-red-200" />
          <span className="text-[10px] text-gray-400">Expense</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-4 w-4 rounded-full bg-[#1E6B4E] flex items-center justify-center">
            <span className="text-[7px] text-white font-bold leading-none">{now.getDate()}</span>
          </div>
          <span className="text-[10px] text-gray-400">Today</span>
        </div>
        <div className="flex items-center gap-1.5">
          <CalendarDays className="h-3 w-3 text-gray-300" />
          <span className="text-[10px] text-gray-400">Tap any date</span>
        </div>
      </div>
    </div>
  );

  if (inline) {
    return (
      <div
        className="w-full rounded-2xl overflow-hidden"
        style={{
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border-default)',
          boxShadow: 'var(--card-shadow)',
        }}
      >
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
              {calendarNav}
            </div>
          </DialogHeader>
          {monthViewContent}
        </DialogContent>
      </Dialog>
    </>
  );
}
