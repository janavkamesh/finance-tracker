import type { Metadata } from "next";
import { createClient, getUser } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Settings — FinTrack India",
};
import { BudgetForm } from "@/components/settings/budget-form";
import { ProfileForm } from "@/components/settings/profile-form";
import { PasswordForm } from "@/components/settings/password-form";
import { PreferencesForm } from "@/components/settings/preferences-form";
import { CategorySection } from "@/components/settings/category-section";
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
      <div
        className="sticky z-10 h-[64px] md:h-[88px] px-4 md:px-8 flex items-center justify-between gap-4"
        style={{ top: 'var(--mobile-header-h, 56px)', background: 'var(--bg-surface)', borderBottom: '1px solid var(--border-default)' }}
      >
        <div className="flex-1 min-w-0">
          <h1 className="text-lg md:text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Settings</h1>
          <p className="hidden md:block text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>
            Manage your profile, preferences, and account data.
          </p>
        </div>
      </div>

    <main className="px-4 md:px-8 pb-8 pt-4">
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
        <CategorySection initialCategories={customCats} />

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
