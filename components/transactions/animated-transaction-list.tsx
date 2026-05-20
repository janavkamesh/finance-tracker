"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
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
  category_user_id?: string | null;
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

const PAYMENT_LABELS: Record<string, string> = {
  cash:        "Cash",
  upi:         "UPI",
  card:        "Card",
  net_banking: "Net Banking",
  wallet:      "Wallet",
};

type RowState = "idle" | "deleting";

export function AnimatedTransactionList({ transactions, categories }: Props) {
  const [rowStates, setRowStates] = useState<Record<string, RowState>>({});

  function getState(id: string): RowState { return rowStates[id] ?? "idle"; }
  function setState(id: string, next: RowState) {
    setRowStates((prev) => ({ ...prev, [id]: next }));
  }

  async function handleDelete(id: string) {
    const snapshot = transactions.find((t) => t.id === id);
    setState(id, "deleting");
    await new Promise((r) => setTimeout(r, 320));
    const result = await deleteTransaction(id);
    if (result?.error) {
      toast.error(result.error);
      setState(id, "idle");
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
          className="w-8 h-8 mb-1"
          style={{ color: 'var(--text-tertiary)' }}
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
        <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Nothing here yet</p>
        <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
          Your recent transactions will appear here
        </p>
      </div>
    );
  }

  // ── List ─────────────────────────────────────────────────────────────────────
  return (
    <ul className="divide-y divide-black/[0.05] dark:divide-white/[0.05]">
      {transactions.map((txn) => {
        const state = getState(txn.id);
        const isDeleting = state === "deleting";
        const isIncome = txn.type === "income";
        const paymentLabel = txn.payment_method
          ? PAYMENT_LABELS[txn.payment_method] ?? null
          : null;

        const Icon = txn.category_name
          ? getCategoryIcon({ name: txn.category_name, icon: txn.category_icon ?? undefined })
          : null;

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
          <li
            key={txn.id}
            className={cn(
              "overflow-hidden grid transition-[grid-template-rows,opacity] ease-in-out",
              isDeleting
                ? "duration-300 grid-rows-[0fr] opacity-0"
                : "duration-300 grid-rows-[1fr] opacity-100"
            )}
          >
            <div className="overflow-hidden min-h-0">
              <div
                className="group flex items-center gap-3 px-5 py-3.5 transition-colors duration-150 hover:bg-[rgba(22,101,52,0.05)] dark:hover:bg-[rgba(0,185,107,0.06)]"
              >
                {/* ── Category icon ─────────────────────────────────────── */}
                <div
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
                  style={
                    txn.category_user_id && txn.category_color
                      ? { backgroundColor: `${txn.category_color}1f`, color: txn.category_color }
                      : { background: 'var(--tag-bg)', color: 'var(--text-secondary)' }
                  }
                >
                  {Icon ? (
                    <Icon className="size-4" />
                  ) : (
                    <span
                      className={cn(
                        "h-2 w-2 rounded-full",
                        isIncome ? "bg-green-500" : "bg-red-500"
                      )}
                    />
                  )}
                </div>

                {/* ── Text block ────────────────────────────────────────── */}
                <div className="flex-1 min-w-0">
                  {/* Title */}
                  <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
                    {txn.description || txn.category_name || "—"}
                  </p>

                  {/* Meta row: category · date · payment */}
                  <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                    {txn.category_name && (
                      <span
                        className="inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-semibold leading-none"
                        style={
                          txn.category_user_id && txn.category_color
                            ? { backgroundColor: `${txn.category_color}1a`, color: txn.category_color }
                            : { background: 'var(--tag-bg)', color: 'var(--tag-text)' }
                        }
                      >
                        {txn.category_name}
                      </span>
                    )}

                    <span
                      className="text-xs tabular-nums shrink-0"
                      style={{ color: 'var(--text-tertiary)' }}
                    >
                      {new Date(txn.date + "T00:00:00").toLocaleDateString("en-IN", {
                        day: "numeric", month: "short", year: "numeric",
                      })}
                    </span>

                    {paymentLabel && (
                      <span
                        className="inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide leading-none"
                        style={{ background: 'var(--tag-bg)', color: 'var(--tag-text)', border: '1px solid var(--tag-border)' }}
                      >
                        {paymentLabel}
                      </span>
                    )}
                  </div>
                </div>

                {/* ── Amount ───────────────────────────────────────────── */}
                <span
                  className="text-sm font-semibold tabular-nums shrink-0"
                  style={{ color: isIncome ? 'var(--income-color)' : 'var(--expense-color)' }}
                >
                  {isIncome ? "+" : "−"}{formatINR(txn.amount)}
                </span>

                {/* ── Actions (hover-reveal) ────────────────────────────── */}
                <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-150 shrink-0">
                  <TransactionDialog categories={categories} transaction={txnForEdit} />
                  <button
                    type="button"
                    onClick={() => handleDelete(txn.id)}
                    className="flex items-center justify-center rounded-lg p-2 transition-colors hover:bg-[rgba(248,113,113,0.08)] hover:text-[#F87171]"
                    style={{ color: 'var(--text-tertiary)' }}
                    aria-label="Delete transaction"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
