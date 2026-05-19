import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Goals — FinTrack India",
};

import { createClient, getUser } from "@/lib/supabase/server";
import { formatINR } from "@/lib/utils";
import { GoalDialog } from "@/components/goals/goal-dialog";
import { AddSavingsDialog } from "@/components/goals/add-savings-dialog";
import { DeleteGoalButton } from "@/components/goals/delete-goal-button";
import { AccountDialog } from "@/components/net-worth/account-dialog";
import { DeleteAccountButton } from "@/components/net-worth/delete-account-button";
import { ASSET_TYPES, LIABILITY_TYPES, ACCOUNT_TYPE_LABELS } from "@/lib/validations/accounts";

function monthsRemaining(targetDate: string | null): number | null {
  if (!targetDate) return null;
  const now = new Date();
  const target = new Date(targetDate + "T00:00:00");
  const months =
    (target.getFullYear() - now.getFullYear()) * 12 +
    (target.getMonth() - now.getMonth());
  return Math.max(months, 0);
}

export default async function GoalsPage() {
  const [user, supabase] = await Promise.all([getUser(), createClient()]);

  const [{ data: goals }, { data: accounts }] = await Promise.all([
    supabase
      .from("goals")
      .select("*")
      .eq("user_id", user!.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("accounts")
      .select("*")
      .eq("user_id", user!.id)
      .order("type")
      .order("name"),
  ]);

  const allGoals = goals ?? [];
  const activeGoals = allGoals.filter((g) => Number(g.saved_amount) < Number(g.target_amount));
  const completedGoals = allGoals.filter((g) => Number(g.saved_amount) >= Number(g.target_amount));

  // Net worth data
  const allAccounts = accounts ?? [];
  const assetAccounts = allAccounts.filter((a) =>
    (ASSET_TYPES as readonly string[]).includes(a.type)
  );
  const liabilityAccounts = allAccounts.filter((a) =>
    (LIABILITY_TYPES as readonly string[]).includes(a.type)
  );
  const totalAssets = assetAccounts.reduce((s, a) => s + Number(a.balance), 0);
  const totalLiabilities = liabilityAccounts.reduce((s, a) => s + Number(a.balance), 0);
  const netWorth = totalAssets - totalLiabilities;

  return (
    <main className="p-6 md:p-8 max-w-3xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Financial Goals</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {allGoals.length === 0
              ? "Set savings targets and track your progress"
              : `${activeGoals.length} active · ${completedGoals.length} completed`}
          </p>
        </div>
        <GoalDialog />
      </div>

      {/* Empty state */}
      {allGoals.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-white py-16 text-center px-6 mb-6">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 mb-4">
            <svg className="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
            </svg>
          </div>
          <p className="text-sm font-medium text-gray-900">No goals yet</p>
          <p className="text-sm text-gray-500 mt-1 mb-5">
            Create a savings goal to track your progress toward big purchases, emergency funds, and more.
          </p>
          <GoalDialog />
        </div>
      )}

      {/* Active goals */}
      {activeGoals.length > 0 && (
        <div className="space-y-4 mb-6">
          {activeGoals.map((goal) => {
            const target = Number(goal.target_amount);
            const saved = Number(goal.saved_amount);
            const pct = Math.min((saved / target) * 100, 100);
            const remaining = target - saved;
            const months = monthsRemaining(goal.target_date);
            const perMonth = months && months > 0 ? remaining / months : null;

            return (
              <div key={goal.id} className="rounded-2xl border border-gray-100 bg-white p-5 group">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <span
                      className="h-3 w-3 shrink-0 rounded-full mt-0.5"
                      style={{ backgroundColor: goal.color ?? "#1E6B4E" }}
                    />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">{goal.name}</p>
                      {goal.target_date && (
                        <p className="text-xs text-gray-400 mt-0.5">
                          Target:{" "}
                          {new Date(goal.target_date + "T00:00:00").toLocaleDateString("en-IN", {
                            month: "short",
                            year: "numeric",
                          })}
                          {months !== null && months > 0 && ` · ${months} month${months !== 1 ? "s" : ""} left`}
                          {months === 0 && " · Due this month"}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity ml-3 shrink-0">
                    <GoalDialog
                      goal={{
                        id: goal.id,
                        name: goal.name,
                        target_amount: target,
                        target_date: goal.target_date,
                        color: goal.color ?? "#1E6B4E",
                      }}
                    />
                    <DeleteGoalButton id={goal.id} />
                  </div>
                </div>

                <div className="h-2 w-full rounded-full bg-gray-100 mb-2">
                  <div
                    className="h-2 rounded-full transition-all"
                    style={{ width: `${pct}%`, backgroundColor: goal.color ?? "#1E6B4E" }}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-gray-500 tabular-nums">
                      <span className="font-semibold text-gray-900">{formatINR(saved)}</span>
                      {" "}saved of {formatINR(target)}
                    </span>
                    <span className="text-xs font-medium" style={{ color: goal.color ?? "#1E6B4E" }}>
                      {pct.toFixed(0)}%
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {perMonth && (
                      <span className="text-xs text-gray-400 tabular-nums">
                        {formatINR(perMonth)}/mo needed
                      </span>
                    )}
                    <AddSavingsDialog goalId={goal.id} goalName={goal.name} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Completed goals */}
      {completedGoals.length > 0 && (
        <div className="mb-6">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">
            Completed
          </h2>
          <div className="space-y-3">
            {completedGoals.map((goal) => {
              const target = Number(goal.target_amount);
              return (
                <div key={goal.id} className="rounded-2xl border border-gray-100 bg-white p-4 flex items-center gap-3 group">
                  <span className="text-lg">🎉</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{goal.name}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{formatINR(target)} saved</p>
                  </div>
                  <div className="flex items-center gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                    <DeleteGoalButton id={goal.id} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Net Worth Card ─────────────────────────────────────────── */}
      <div className="rounded-2xl border border-gray-100 bg-white overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50">
          <div>
            <h2 className="text-sm font-semibold text-gray-900">Net Worth</h2>
            <p className="text-xs text-gray-400 mt-0.5">Assets minus liabilities</p>
          </div>
          <AccountDialog />
        </div>

        {/* Summary strip */}
        <div className="grid grid-cols-3 divide-x divide-gray-50 border-b border-gray-50">
          <div className="px-4 py-3.5 text-center">
            <p className="text-xs text-gray-400 mb-1">Total Assets</p>
            <p className="text-base font-bold text-green-600 tabular-nums">{formatINR(totalAssets)}</p>
          </div>
          <div className="px-4 py-3.5 text-center">
            <p className="text-xs text-gray-400 mb-1">Liabilities</p>
            <p className="text-base font-bold text-red-600 tabular-nums">{formatINR(totalLiabilities)}</p>
          </div>
          <div className="px-4 py-3.5 text-center">
            <p className="text-xs text-gray-400 mb-1">Net Worth</p>
            <p className={`text-base font-bold tabular-nums ${netWorth >= 0 ? "text-[#1E6B4E]" : "text-red-600"}`}>
              {netWorth >= 0 ? "+" : ""}{formatINR(netWorth)}
            </p>
          </div>
        </div>

        {/* Account list */}
        {allAccounts.length === 0 ? (
          <div className="px-5 py-10 text-center">
            <p className="text-sm text-gray-400">No accounts added yet</p>
            <p className="text-xs text-gray-300 mt-1">Add your bank accounts, investments, and loans to track net worth</p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-50">
            {allAccounts.map((account) => {
              const isLiability = (LIABILITY_TYPES as readonly string[]).includes(account.type);
              const label = ACCOUNT_TYPE_LABELS[account.type as keyof typeof ACCOUNT_TYPE_LABELS] ?? account.type;
              return (
                <li key={account.id} className="flex items-center gap-3 px-5 py-3 group hover:bg-gray-50/50 transition-colors">
                  <div
                    className="h-7 w-7 shrink-0 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: `${account.color ?? (isLiability ? "#DC2626" : "#1E6B4E")}18` }}
                  >
                    <div
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: account.color ?? (isLiability ? "#DC2626" : "#1E6B4E") }}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{account.name}</p>
                    <p className="text-xs text-gray-400">{label}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-semibold tabular-nums ${isLiability ? "text-red-600" : "text-gray-900"}`}>
                      {isLiability ? "-" : ""}{formatINR(Number(account.balance))}
                    </span>
                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <AccountDialog
                        account={{
                          id: account.id,
                          name: account.name,
                          type: account.type,
                          balance: Number(account.balance),
                          color: account.color,
                        }}
                      />
                      <DeleteAccountButton id={account.id} />
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </main>
  );
}
