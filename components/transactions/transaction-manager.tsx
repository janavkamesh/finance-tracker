"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { format, isToday, isYesterday } from "date-fns";
import { TransactionFilters } from "./transaction-filters";
import { TransactionDialog } from "./transaction-dialog";
import { DeleteTransactionButton } from "./delete-transaction-button";
import { BulkActionsBar } from "./bulk-actions-bar";
import { getCategoryIcon } from "@/lib/category-icons";
import { formatINR } from "@/lib/utils";
import { fetchTransactionsBatch } from "@/app/actions/transactions";

interface TxnRow {
  id: string;
  type: "income" | "expense";
  amount: number;
  date: string;
  description: string;
  category_id: string;
  payment_method?: string | null;
  category_name?: string | null;
  category_color?: string | null;
  category_icon?: string | null;
}

interface CategoryItem {
  id: string;
  name: string;
  type: "income" | "expense" | "both";
  color: string | null;
  icon?: string | null;
}

interface Props {
  initialTransactions: TxnRow[];
  categories: CategoryItem[];
  activeMonth?: string;
  filters?: {
    search: string;
    typeFilter: string;
    categoryFilter: string;
    period: string;
  };
}

function getGroupLabel(dateString: string) {
  const dateObj = new Date(dateString + "T00:00:00");
  if (isToday(dateObj)) return "Today";
  if (isYesterday(dateObj)) return "Yesterday";
  return format(dateObj, "MMM d, yyyy");
}

export function TransactionManager({ initialTransactions, categories, activeMonth, filters }: Props) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Infinite Scroll State
  const [transactions, setTransactions] = useState<TxnRow[]>(initialTransactions);
  const [hasMore, setHasMore] = useState(initialTransactions.length === 20);
  const [isFetching, setIsFetching] = useState(false);
  const [offset, setOffset] = useState(20);

  // Sync state if initialTransactions change (e.g. from filters)
  useEffect(() => {
    setTransactions(initialTransactions);
    setOffset(20);
    setHasMore(initialTransactions.length === 20);
    setSelectedIds(new Set());
  }, [initialTransactions]);

  const loadMoreRef = useRef<HTMLDivElement>(null);

  const loadMore = useCallback(async () => {
    if (isFetching || !hasMore || !filters) return;
    setIsFetching(true);
    try {
      const newBatch = await fetchTransactionsBatch({
        ...filters,
        offset,
        limit: 20
      });
      if (newBatch.length > 0) {
        setTransactions((prev) => {
           // simple deduplication based on ID just in case
           const existingIds = new Set(prev.map(t => t.id));
           const filteredBatch = newBatch.filter(t => !existingIds.has(t.id));
           return [...prev, ...filteredBatch];
        });
        setOffset((prev) => prev + newBatch.length);
      }
      if (newBatch.length < 20) {
        setHasMore(false);
      }
    } catch (e) {
      console.error("Error fetching transactions batch:", e);
    } finally {
      setIsFetching(false);
    }
  }, [isFetching, hasMore, filters, offset]);

  useEffect(() => {
    if (!hasMore) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        loadMore();
      }
    }, { rootMargin: "200px" });
    
    if (loadMoreRef.current) observer.observe(loadMoreRef.current);
    return () => observer.disconnect();
  }, [hasMore, loadMore]);

  const allSelected = transactions.length > 0 && selectedIds.size === transactions.length;
  const someSelected = selectedIds.size > 0;

  function toggleAll() {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(transactions.map((t) => t.id)));
    }
  }

  function toggleOne(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const clearSelection = useCallback(() => setSelectedIds(new Set()), []);

  const filterCats = categories.map((c) => ({ id: c.id, name: c.name }));
  const selectedArray = Array.from(selectedIds);

  // Group transactions by date
  const groupedTransactions: Record<string, TxnRow[]> = {};
  transactions.forEach((txn) => {
    const label = getGroupLabel(txn.date);
    if (!groupedTransactions[label]) groupedTransactions[label] = [];
    groupedTransactions[label].push(txn);
  });

  return (
    <>
      {/* Bulk actions bar — replaces filter bar when items are selected */}
      {someSelected ? (
        <BulkActionsBar
          selectedIds={selectedArray}
          categories={filterCats}
          onClear={clearSelection}
        />
      ) : (
        <div className="mb-4">
          <TransactionFilters
            categories={filterCats}
            showExportMenu
          />
        </div>
      )}

      {/* Transaction list */}
      {transactions.length > 0 && (
        <div className="rounded-2xl border border-gray-100 bg-white overflow-hidden relative">
          {/* Select-all header */}
          <div className="flex items-center gap-3 px-4 py-2.5 border-b border-gray-50 bg-gray-50/40 sticky top-0 z-10">
            <input
              type="checkbox"
              checked={allSelected}
              onChange={toggleAll}
              className="h-4 w-4 rounded border-gray-300 accent-[#1E6B4E] cursor-pointer"
              aria-label="Select all transactions"
            />
            <span className="text-xs text-gray-400 font-medium">
              {someSelected
                ? `${selectedIds.size} of ${transactions.length} selected`
                : "Select all"}
            </span>
          </div>

          <div className="divide-y divide-gray-50">
            {Object.entries(groupedTransactions).map(([dateLabel, txns]) => (
              <div key={dateLabel}>
                {/* Sub-header */}
                <div className="px-4 py-2 bg-gray-50/80 border-y border-gray-100 first:border-t-0 sticky top-10 z-10 backdrop-blur-sm">
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    {dateLabel}
                  </h3>
                </div>
                
                <ul className="divide-y divide-gray-50">
                  {txns.map((txn) => {
                    const isIncome = txn.type === "income";
                    const isSelected = selectedIds.has(txn.id);
                    const Icon = txn.category_name
                      ? getCategoryIcon({ name: txn.category_name, icon: txn.category_icon ?? undefined })
                      : null;

                    return (
                      <li
                        key={txn.id}
                        className={`flex items-center gap-2.5 px-4 py-3 transition-colors group ${
                          isSelected
                            ? "bg-[#1E6B4E]/5"
                            : "hover:bg-gray-50/60"
                        }`}
                      >
                        {/* Checkbox */}
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleOne(txn.id)}
                          className="h-4 w-4 rounded border-gray-300 accent-[#1E6B4E] cursor-pointer shrink-0"
                          aria-label={`Select ${txn.description || txn.category_name || "transaction"}`}
                        />

                        <div
                          className={`h-2 w-2 shrink-0 rounded-full ${
                            isIncome ? "bg-green-500" : "bg-red-500"
                          }`}
                        />

                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {txn.description || txn.category_name || "—"}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5">
                            {txn.category_name && (
                              <span
                                className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs font-medium"
                                style={{
                                  backgroundColor: txn.category_color
                                    ? `${txn.category_color}18`
                                    : "#f3f4f6",
                                  color: txn.category_color ?? "#6b7280",
                                }}
                              >
                                {Icon && <Icon className="size-3 shrink-0" />}
                                {txn.category_name}
                              </span>
                            )}
                          </div>
                        </div>

                        <span
                          className={`text-sm font-semibold tabular-nums shrink-0 ${
                            isIncome ? "text-green-600" : "text-red-600"
                          }`}
                        >
                          {isIncome ? "+" : "-"}
                          {formatINR(txn.amount)}
                        </span>

                        <div className="flex items-center gap-0.5">
                          <TransactionDialog
                            categories={categories}
                            transaction={{
                              id: txn.id,
                              type: txn.type,
                              amount: txn.amount,
                              category_id: txn.category_id,
                              description: txn.description,
                              date: txn.date,
                            }}
                          />
                          <DeleteTransactionButton id={txn.id} />
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>

          {/* Skeleton Loader / Observer target */}
          <div ref={loadMoreRef} className="w-full">
            {isFetching && (
              <div className="px-4 py-4 animate-pulse border-t border-gray-50 flex items-center gap-3">
                <div className="h-4 w-4 bg-gray-200 rounded shrink-0"></div>
                <div className="h-2 w-2 bg-gray-200 rounded-full shrink-0"></div>
                <div className="flex-1">
                   <div className="h-4 bg-gray-200 rounded w-1/3 mb-2"></div>
                   <div className="h-3 bg-gray-100 rounded w-1/4"></div>
                </div>
                <div className="h-4 bg-gray-200 rounded w-16 shrink-0"></div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
