import type { Metadata } from "next";
import { createClient, getUser } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Settings — FinTrack India",
};
import { BudgetForm } from "@/components/settings/budget-form";
import { ProfileForm } from "@/components/settings/profile-form";
import { PasswordForm } from "@/components/settings/password-form";
import { CategoryDialog } from "@/components/settings/category-dialog";
import { DeleteCategoryButton } from "@/components/settings/delete-category-button";

type Category = {
  id: string;
  name: string;
  type: "income" | "expense" | "both";
  color: string | null;
  is_system: boolean;
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
      .select("id, name, type, color, is_system")
      .or(`user_id.eq.${user!.id},user_id.is.null`)
      .order("is_system", { ascending: false })
      .order("name"),
  ]);

  const systemCats = (categories ?? []).filter((c) => c.is_system) as Category[];
  const customCats = (categories ?? []).filter((c) => !c.is_system) as Category[];

  return (
    <main className="p-6 md:p-8 max-w-3xl space-y-6">
      <h1 className="text-xl font-bold text-gray-900">Settings</h1>
      <p className="text-sm text-gray-500 mt-0.5">Manage your profile, budget, and categories</p>

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
            {customCats.map((cat) => (
              <li
                key={cat.id}
                className="flex items-center gap-3 px-6 py-3.5 group"
              >
                <span
                  className="h-3 w-3 shrink-0 rounded-full"
                  style={{ backgroundColor: cat.color ?? "#9ca3af" }}
                />
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
            ))}
          </ul>
        )}
      </section>

      {/* ── System categories (read-only) ──────────────────────────── */}
      <section className="rounded-2xl border border-gray-100 bg-white overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-50">
          <h2 className="text-sm font-semibold text-gray-900">
            System categories
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Built-in categories available to all users — cannot be edited.
          </p>
        </div>
        <div className="px-6 py-4 flex flex-wrap gap-2">
          {systemCats.map((cat) => (
            <span
              key={cat.id}
              className="inline-flex items-center gap-1.5 rounded-full border border-gray-100 bg-gray-50 px-3 py-1 text-xs font-medium text-gray-600"
            >
              <span
                className="h-2 w-2 rounded-full shrink-0"
                style={{ backgroundColor: cat.color ?? "#9ca3af" }}
              />
              {cat.name}
            </span>
          ))}
        </div>
      </section>
    </main>
  );
}
