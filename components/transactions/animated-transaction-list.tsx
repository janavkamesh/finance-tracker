"use client";

import { useState } from "react";
import {
  Banknote, Smartphone, CreditCard, Building2, Wallet, Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { formatINR } from "@/lib/utils";
import { deleteTransaction, restoreTransaction } from "@/actions/transactions";
import { TransactionDialog } from "@/components/transactions/transaction-dialog";
import { getCategoryIcon } from "@/lib/category-icons";

// ── Types ──────────────────────────────────────────────────────────────────────
export interface TransactionItem {
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

export interface CategoryItem {
  id: string;
  name: string;
  type: "income" | "expense" | "both";
  color: string | null;
  icon?: string | null;
}

interface Props {
  transactions: TransactionItem[];
  categories: CategoryItem[];
}

// ── Payment method config ──────────────────────────────────────────────────────
const PAYMENT_METHODS: Record<
  string,
  { label: string; Icon: React.ComponentType<{ className?: string }> }
> = {
  cash:        { label: "Cash",        Icon: Banknote },
  upi:         { label: "UPI",         Icon: Smartphone },
  card:        { label: "Card",        Icon: CreditCard },
  net_banking: { label: "Net Banking", Icon: Building2 },
  wallet:      { label: "Wallet",      Icon: Wallet },
};

// ── Per-row interaction state ──────────────────────────────────────────────────
type RowState = "idle" | "deleting";

// ── Component ─────────────────────────────────────────────────────────────────
export function AnimatedTransactionList({ transactions, categories }: Props) {
  const [rowStates, setRowStates] = useState<Record<string, RowState>>({});

  function getState(id: string): RowState {
    return rowStates[id] ?? "idle";
  }

  function setState(id: string, next: RowState) {
    setRowStates((prev) => ({ ...prev, [id]: next }));
  }

  async function handleDelete(id: string) {
    // Snapshot data before deletion so we can restore it on Undo
    const snapshot = transactions.find((t) => t.id === id);

    // 1. Trigger the collapse + fade animation
    setState(id, "deleting");

    // 2. Wait for animation to complete before hitting the server.
    //    This guarantees the row is visually gone before the DOM updates,
    //    eliminating any layout jump.
    await new Promise((r) => setTimeout(r, 320));

    // 3. Call server action — revalidatePath("/dashboard") removes it from the list
    const result = await deleteTransaction(id);
    if (result?.error) {
      toast.error(result.error);
      setState(id, "idle"); // reverse animation on error
    } else {
      toast.success("Transaction deleted", {
        action: snapshot
          ? {
              label: "Undo",
              onClick: () => {
                restoreTransaction({
                  type: snapshot.type,
                  amount: snapshot.amount,
                  category_id: snapshot.category_id,
                  description: snapshot.description,
                  date: snapshot.date,
                  payment_method: snapshot.payment_method ?? null,
                }).then((r) => {
                  if (r?.error) toast.error("Couldn't restore transaction");
                  else toast.success("Transaction restored");
                });
              },
            }
          : undefined,
      });
    }
  }

  // ── Empty state ──────────────────────────────────────────────────────────────
  if (transactions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-1 text-center">
        <svg
          className="w-8 h-8 text-gray-200 mb-1"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M9 14.25l6-6m4.5-3.493V21.75l-3.75-1.5-3.75 1.5-3.75-1.5-3.75 1.5V4.757c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0c1.1.128 1.907 1.077 1.907 2.185z"
          />
        </svg>
        <p className="text-sm font-medium text-gray-400">Nothing here yet</p>
        <p className="text-xs text-gray-300">
          Your recent transactions will appear here
        </p>
      </div>
    );
  }

  // ── List ─────────────────────────────────────────────────────────────────────
  return (
    <ul>
      {transactions.map((txn, idx) => {
        const state = getState(txn.id);
        const isDeleting = state === "deleting";
        const isIncome = txn.type === "income";
        const pm = txn.payment_method ? PAYMENT_METHODS[txn.payment_method] : null;

        // Shape for the edit dialog
        const txnForEdit = {
          id: txn.id,
          type: txn.type,
          amount: txn.amount,
          category_id: txn.category_id,
          description: txn.description,
          date: txn.date,
          payment_method: txn.payment_method,
        };

        return (
          // ── Outer li — owns the height + opacity animation ─────────────────
          <li
            key={txn.id}
            className={cn(
              "overflow-hidden",
              // Grid-row trick: animates the *actual* content height, not a capped max-height.
              // grid-rows-[1fr] → grid-rows-[0fr] collapses cleanly at the real row height.
              "grid transition-[grid-template-rows,opacity] ease-in-out",
              isDeleting
                ? "duration-300 grid-rows-[0fr] opacity-0"
                : "duration-300 grid-rows-[1fr] opacity-100"
            )}
          >
            {/* Inner div — required for grid-rows collapse trick */}
            <div className="overflow-hidden min-h-0">
              {/* ── Row content ──────────────────────────────────────────────── */}
              <div
                className={cn(
                  "group flex items-stretch cursor-default",
                  "transition-colors duration-150 hover:bg-gray-50/70",
                  // Divider between rows (skip on last item)
                  idx < transactions.length - 1 && "border-b border-gray-50"
                )}
              >
                {/* Left colour stripe */}
                <div
                  className={cn(
                    "w-[3px] shrink-0 transition-colors duration-300",
                    isIncome ? "bg-green-400" : "bg-red-400"
                  )}
                />

                <div className="flex flex-1 items-center gap-3 px-5 py-3.5">
                  {/* ── Main content ───────────────────────────────────────── */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">
                      {txn.description || txn.category_name || "—"}
                    </p>

                    {/* Meta row: category · date · payment method */}
                    <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                      {txn.category_name && (() => {
                        const CatIcon = getCategoryIcon({
                          name: txn.category_name!,
                          icon: txn.category_icon,
                        });
                        return (
                          <span
                            className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs font-medium"
                            style={{
                              backgroundColor: txn.category_color
                                ? `${txn.category_color}18`
                                : "#f3f4f6",
                              color: txn.category_color ?? "#6b7280",
                            }}
                          >
                            <CatIcon className="size-2.5 shrink-0" />
                            {txn.category_name}
                          </span>
                        );
                      })()}

                      <span className="text-xs text-gray-400">
                        {new Date(txn.date + "T00:00:00").toLocaleDateString(
                          "en-IN",
                          { day: "numeric", month: "short" }
                        )}
                      </span>

                      {/* Payment method badge — only shown when set */}
                      {pm && (
                        <span className="inline-flex items-center gap-1 rounded-md border border-gray-100 bg-gray-50 px-1.5 py-0.5 text-[10px] font-medium text-gray-500">
                          <pm.Icon className="size-2.5 shrink-0" />
                          {pm.label}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* ── Amount ─────────────────────────────────────────────── */}
                  <span
                    className={cn(
                      "text-base font-bold tabular-nums shrink-0",
                      isIncome ? "text-green-600" : "text-gray-800"
                    )}
                  >
                    {isIncome ? "+" : "−"}{formatINR(txn.amount)}
                  </span>

                  {/* ── Action buttons (revealed on hover) ─────────────────── */}
                  <div className="flex items-center gap-0.5 transition-opacity duration-150 shrink-0 opacity-0 group-hover:opacity-100">
                    <TransactionDialog
                      categories={categories}
                      transaction={txnForEdit}
                    />
                    <button
                      type="button"
                      onClick={() => handleDelete(txn.id)}
                      className="flex items-center justify-center rounded-lg p-2 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-500"
                      aria-label="Delete transaction"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
