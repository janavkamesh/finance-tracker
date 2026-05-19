import type { Metadata } from "next";
import { createClient, getUser } from "@/lib/supabase/server";
import { getCategoryIcon } from "@/lib/category-icons";

export const metadata: Metadata = {
  title: "Settings — FinTrack India",
};
import { BudgetForm } from "@/components/settings/budget-form";
import { ProfileForm } from "@/components/settings/profile-form";
import { PasswordForm } from "@/components/settings/password-form";
import { PreferencesForm } from "@/components/settings/preferences-form";
import { CategoryDialog } from "@/components/settings/category-dialog";
import { DeleteCategoryButton } from "@/components/settings/delete-category-button";
import { DataExportButton } from "@/components/settings/data-export-button";

type Category = {
  id: string;
  name: string;
  type: "income" | "expense" | "both";
  color: string | null;
  icon: string | null;
  is_system: boolean;
  monthly_limit: number | null;
};

const TYPE_LABEL: Record<string, string> = {
  income: "Income",
  expense: "Expense",
  both: "Both",
};

const TYPE_STYLE: Record<string, string> = {
  income: "bg-green-100 text-green-700",
  expense: "bg-red-100 text-red-700",
  both: "bg-[#1E6B4E]/10 text-[#1E6B4E]",
};

export default async function SettingsPage() {
  const [user, supabase] = await Promise.all([getUser(), createClient()]);

  const [{ data: profile }, { data: categories }] = await Promise.all([
    supabase
      .from("profiles")
      .select("full_name, monthly_budget")
      .eq("id", user!.id)
      .single(),
    supabase
      .from("categories")
      .select("id, name, type, color, icon, is_system, monthly_limit")
      .or(`user_id.eq.${user!.id},user_id.is.null`)
      .order("is_system", { ascending: false })
      .order("name"),
  ]);

  const customCats = (categories ?? []).filter((c) => !c.is_system) as Category[];

  return (
    <>
      {/* Sticky header — matches Home & Transactions */}
      <div className="sticky top-14 md:top-0 z-10 bg-white border-b border-gray-100 h-[88px] px-6 md:px-8 flex items-center justify-between gap-4">
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold text-gray-900">Settings</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Manage your profile, preferences, and account data.
          </p>
        </div>
      </div>

    <main className="px-6 md:px-8 pb-8 pt-4">
      <div className="mx-auto w-full max-w-3xl space-y-6">
        {/* ── Profile ────────────────────────────────────────────────── */}
        <section className="rounded-2xl border border-gray-100 bg-white p-6">
          <div className="mb-4">
            <h2 className="text-sm font-semibold text-gray-900">Profile</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Update your display name.
            </p>
          </div>
          <ProfileForm fullName={profile?.full_name ?? ""} />
        </section>

        {/* ── Preferences ────────────────────────────────────────────── */}
        <section className="rounded-2xl border border-gray-100 bg-white p-6">
          <div className="mb-4">
            <h2 className="text-sm font-semibold text-gray-900">Preferences</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Choose how amounts and dates appear across the app.
            </p>
          </div>
          <PreferencesForm />
        </section>

        {/* ── Password ───────────────────────────────────────────────── */}
        <section className="rounded-2xl border border-gray-100 bg-white p-6">
          <div className="mb-4">
            <h2 className="text-sm font-semibold text-gray-900">Change password</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Choose a new password for your account.
            </p>
          </div>
          <PasswordForm />
        </section>

        {/* ── Budget ─────────────────────────────────────────────────── */}
        <section className="rounded-2xl border border-gray-100 bg-white p-6">
          <div className="mb-4">
            <h2 className="text-sm font-semibold text-gray-900">Monthly budget</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Set a monthly spending limit. You&apos;ll see progress on the dashboard.
            </p>
          </div>
          <BudgetForm current={profile?.monthly_budget ?? null} />
        </section>

        {/* ── Custom categories ──────────────────────────────────────── */}
        <section className="rounded-2xl border border-gray-100 bg-white overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-50">
            <div>
              <h2 className="text-sm font-semibold text-gray-900">
                Custom categories
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Add your own categories for income and expenses.
              </p>
            </div>
            <CategoryDialog />
          </div>

          {customCats.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center px-6">
              <p className="text-sm text-gray-400">No custom categories yet.</p>
              <p className="text-xs text-gray-400 mt-1">
                Add one above to personalise your tracking.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-gray-50">
              {customCats.map((cat) => {
                const CatIcon = getCategoryIcon(cat);
                return (
                  <li
                    key={cat.id}
                    className="flex items-center gap-3 px-6 py-3.5 group"
                  >
                    <div
                      className="flex h-7 w-7 items-center justify-center rounded-lg shrink-0"
                      style={{ backgroundColor: `${cat.color ?? "#9ca3af"}18` }}
                    >
                      <CatIcon className="size-4" style={{ color: cat.color ?? "#9ca3af" }} />
                    </div>
                    <span className="flex-1 text-sm font-medium text-gray-900 truncate">
                      {cat.name}
                    </span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${TYPE_STYLE[cat.type]}`}
                    >
                      {TYPE_LABEL[cat.type]}
                    </span>
                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <CategoryDialog category={cat} />
                      <DeleteCategoryButton id={cat.id} />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* ── Data & Privacy ─────────────────────────────────────────── */}
        <section className="rounded-2xl border border-gray-100 bg-white p-6">
          <div className="mb-4">
            <h2 className="text-sm font-semibold text-gray-900">Data &amp; Privacy</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Download a full copy of your transactions, categories, and budgets.
              You always own your financial data.
            </p>
          </div>
          <div className="flex justify-end">
            <DataExportButton />
          </div>
        </section>
      </div>
    </main>
    </>
  );
}
