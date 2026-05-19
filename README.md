# FinTrack India

Personal finance tracker for Indian working professionals. Built with Next.js 16 App Router, Supabase, Tailwind CSS v4, and Recharts.

**Live:** https://finance-tracker-drab-mu.vercel.app  
**Repo:** https://github.com/janavkamesh/finance-tracker

---

## Tech Stack

| Layer | Choice | Notes |
|---|---|---|
| Framework | Next.js 16.2.6 | App Router, Turbopack, React 19 |
| Database & Auth | Supabase | PostgreSQL + RLS + SSR cookies |
| Styling | Tailwind CSS v4 | PostCSS plugin, CSS variables, oklch colors |
| UI primitives | shadcn/ui (base-nova) | Re-exported in `components/ui/` |
| Forms | react-hook-form + Zod | `valueAsNumber` on amount inputs; Zod v4 `.issues` not `.errors` |
| Charts | Recharts v3 | Client components only; null-guard on `formatter` |
| Notifications | Sonner | `<Toaster richColors position="bottom-right" offset={24} />` in root layout |
| Icons | lucide-react | |
| Deployment | Vercel | Auto-deploy from GitHub `main` branch |

---

## Project Structure

```
FinanceTrackerWebsite/
├── proxy.ts                          # Auth middleware (NOT middleware.ts — Next.js 16 rename)
├── app/
│   ├── layout.tsx                    # Root layout: Geist fonts, Sonner Toaster, metadata
│   ├── globals.css                   # Tailwind v4 imports, CSS vars, dark mode skeleton
│   ├── page.tsx                      # Root "/" — redirects to /dashboard or /login via middleware
│   ├── not-found.tsx                 # Branded 404 page
│   ├── (auth)/
│   │   ├── login/page.tsx            # Login form (client, react-hook-form)
│   │   └── signup/page.tsx           # Signup form (client, email-confirmation state)
│   └── (dashboard)/
│       ├── layout.tsx                # Async server component: fetches profile, renders sidebar + mobile nav
│       ├── error.tsx                 # Error boundary — uses `unstable_retry` (Next.js 16 API)
│       ├── dashboard/
│       │   ├── page.tsx              # Main dashboard
│       │   └── loading.tsx           # Skeleton layout
│       ├── transactions/
│       │   ├── page.tsx              # Transaction list with filters
│       │   └── loading.tsx
│       ├── reports/
│       │   ├── page.tsx              # Annual analytics
│       │   └── loading.tsx
│       └── settings/
│           ├── page.tsx              # Profile, password, budget, categories
│           └── loading.tsx
├── actions/                          # Server Actions ("use server")
│   ├── auth.ts                       # signIn, signUp, signOut
│   ├── transactions.ts               # addTransaction, updateTransaction, deleteTransaction
│   ├── categories.ts                 # addCategory, updateCategory, deleteCategory
│   ├── budget.ts                     # updateBudget
│   └── profile.ts                    # updateProfile, updatePassword
├── components/
│   ├── ui/                           # shadcn/ui primitives (badge, button, card, dialog,
│   │                                 #   dropdown-menu, input, label, select, separator,
│   │                                 #   skeleton, sonner)
│   ├── layout/
│   │   ├── sidebar.tsx               # Desktop sticky sidebar (240px)
│   │   ├── mobile-header.tsx         # Fixed mobile header + slide-out drawer (client)
│   │   ├── nav-links.tsx             # 4 nav items, active state via usePathname (client)
│   │   └── sign-out-button.tsx       # <form action={signOut}> pattern
│   ├── dashboard/
│   │   ├── monthly-bar-chart.tsx     # Recharts BarChart — 6-month income vs expense
│   │   └── category-pie-chart.tsx    # Recharts PieChart donut — current month expenses
│   ├── transactions/
│   │   ├── transaction-dialog.tsx    # Add/edit dialog — type toggle, amount, category, date, notes
│   │   ├── transaction-filters.tsx   # Search (debounced 350ms), type, period, category (client)
│   │   └── delete-transaction-button.tsx  # Two-click confirm delete
│   ├── settings/
│   │   ├── profile-form.tsx          # Full name update (Save disabled until dirty)
│   │   ├── budget-form.tsx           # ₹-prefix monthly budget input
│   │   ├── password-form.tsx         # New + confirm password, side-by-side
│   │   ├── category-dialog.tsx       # Add/edit category with 12-color palette picker
│   │   └── delete-category-button.tsx  # Two-click confirm; handles FK constraint error
│   └── reports/
│       ├── area-trend-chart.tsx      # Recharts AreaChart — income vs expense trend with gradient fills
│       └── year-selector.tsx         # Prev/next year buttons; future years disabled (client)
└── lib/
    ├── utils.ts                      # cn() classname helper, formatINR() currency formatter
    ├── supabase/
    │   ├── server.ts                 # createClient() for Server Components and Actions
    │   ├── client.ts                 # createClient() for Client Components
    │   └── middleware.ts             # updateSession() — session refresh + route protection
    └── validations/
        ├── auth.ts                   # loginSchema, signupSchema
        ├── transaction.ts            # transactionSchema
        └── settings.ts              # categorySchema, budgetSchema, profileSchema, passwordSchema
```

---

## Database Schema

```sql
-- Managed in Supabase (PostgreSQL)

public.profiles
  id              uuid  PRIMARY KEY  -- matches auth.users.id
  full_name       text
  monthly_budget  numeric           -- null means "not set"
  updated_at      timestamptz

public.categories
  id        uuid  PRIMARY KEY
  user_id   uuid  NULLABLE          -- null = system category (shared across all users)
  name      text  NOT NULL
  type      text  CHECK (type IN ('income','expense','both'))
  color     text                    -- hex string e.g. '#16A34A'
  is_system boolean DEFAULT false

public.transactions
  id          uuid  PRIMARY KEY
  user_id     uuid  NOT NULL  REFERENCES auth.users
  type        text  CHECK (type IN ('income','expense'))
  amount      numeric NOT NULL
  description text NOT NULL
  date        date NOT NULL
  notes       text                  -- optional long-form note
  category_id uuid  REFERENCES categories
  created_at  timestamptz DEFAULT now()
```

**RLS is enabled on all tables.** Every query in server actions and pages filters by `user_id = auth.uid()`.

**System categories** (12 built-in) have `user_id = null` and `is_system = true`. Queries fetch them with `.or('user_id.eq.${uid},user_id.is.null')`. The settings page and category actions guard against editing/deleting system categories with `.eq('is_system', false)`.

---

## Authentication Flow

`proxy.ts` runs on every request (except static assets). It calls `updateSession()` which:
- Refreshes the Supabase session cookie
- Redirects unauthenticated users away from `/dashboard/**`
- Redirects authenticated users away from `/login` and `/signup`

Auth actions (`actions/auth.ts`):
- `signIn` — `supabase.auth.signInWithPassword()` → `redirect('/dashboard')`
- `signUp` — `supabase.auth.signUp()` → returns `{ confirmEmail: true }` when email confirmation is required; the signup page swaps to a confirmation screen without a redirect
- `signOut` — `supabase.auth.signOut()` → `redirect('/login')`

All Server Actions call `supabase.auth.getUser()` and abort early if no user is found — never trust client-supplied user IDs.

---

## Server Actions Pattern

All actions follow this structure:

```ts
"use server"
export async function doSomething(formData: FormData) {
  // 1. Parse + validate with Zod
  const parsed = schema.safeParse({ field: formData.get("field") });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  // 2. Get authenticated user
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  // 3. DB operation — always filter by user_id
  const { error } = await supabase.from("table").insert({ ...parsed.data, user_id: user.id });
  if (error) return { error: error.message };

  // 4. Revalidate affected pages
  revalidatePath("/affected-page");
}
```

Client components call actions and handle `{ error }` returns with `toast.error()`. Successful mutations that need a redirect use `redirect()` inside the action (throws `NEXT_REDIRECT` — never catch it).

---

## Pages

### `/dashboard`
Fetches 6 months of transactions in a single query. Server-side aggregation produces:
- **Summary cards**: current month income, expenses, net savings, transaction count
- **Budget progress bar**: `min(expense/budget, 1) * 100%`; color: green → amber (≥75%) → red (over)
- **Monthly bar chart**: last 6 months, grouped income/expense bars
- **Category donut**: current month expenses broken down by category with percentage legend
- **Recent transactions**: latest 5 from the 6-month window

### `/transactions`
Accepts `searchParams` (a Promise in Next.js 16 — must be awaited). Builds a Supabase query with optional filters:
- `search` → `.ilike('description', '%term%')`
- `type` → `.eq('type', 'income'|'expense')`
- `category` → `.eq('category_id', uuid)`
- `period` → `.gte('date', start).lte('date', end)` — periods: `this_month`, `last_month`, `3_months`, all

`TransactionFilters` is a client component wrapped in `<Suspense>` because it uses `useSearchParams()`. It pushes URL params via `router.replace()` with debouncing on the search field (350ms).

The `TransactionDialog` component works in both add and edit modes. The type toggle (income/expense) resets the category selection because categories are typed. Amount field uses `{ valueAsNumber: true }` on `register()` — **not** `z.coerce.number()` (which would break react-hook-form's generic type inference).

### `/reports`
Year parameter from `searchParams` (validated: 4-digit integer, not in the future). Queries all transactions for the year, then aggregates server-side:
- Annual totals + savings rate formula: `(income - expense) / income * 100`
- 12 `MonthPoint` objects for the area chart
- Top 7 expense categories (Map aggregation, sorted descending)
- Monthly table rows capped at current month when viewing current year

### `/settings`
Four sections in one server-fetched page:
1. **Profile** — `ProfileForm` with `full_name`; `updateProfile` updates both `profiles` table and `auth.user_metadata`
2. **Password** — `PasswordForm`; Zod `.refine()` ensures new_password === confirm_password
3. **Monthly budget** — `BudgetForm`; saves `0` as `null` in DB (means "not set")
4. **Custom categories** — CRUD list with `CategoryDialog` (add/edit) and `DeleteCategoryButton`; system categories shown below as read-only chips

---

## Validation Schemas

```ts
// lib/validations/auth.ts
loginSchema:    { email: string (email), password: string (min 6) }
signupSchema:   { full_name: string (2–100), email, password (min 6) }

// lib/validations/transaction.ts
transactionSchema: {
  type: "income" | "expense"
  amount: number (positive, max 10_000_000)    // z.number() + valueAsNumber on input
  category_id: string (uuid)
  description: string (1–255)
  date: string (YYYY-MM-DD regex)
  notes?: string (max 1000)
}

// lib/validations/settings.ts
categorySchema:  { name: string (1–50), type: "income"|"expense"|"both", color?: string }
budgetSchema:    { monthly_budget: number (0–100_000_000) }
profileSchema:   { full_name: string (2–100) }
passwordSchema:  { new_password: string (min 6), confirm_password }
                 .refine(data => data.new_password === data.confirm_password)
```

> **Zod v4 note**: Use `.issues[0].message` not `.errors`. `invalid_type_error` option does not exist — use the `message` parameter directly.

---

## Utility Functions

```ts
// lib/utils.ts

cn(...inputs: ClassValue[])
// Merges Tailwind classes safely using clsx + tailwind-merge
// Usage: cn("base-class", condition && "conditional-class", props.className)

formatINR(amount: number): string
// Formats a number as Indian Rupee currency
// Uses Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })
// e.g. 150000 → "₹1,50,000"
```

---

## Charts

All chart components are `"use client"` and live in `components/dashboard/` and `components/reports/`.

**Recharts v3 gotchas:**
- `Tooltip formatter` receives `ValueType | undefined` — always null-guard: `value != null ? formatINR(Number(value)) : ""`
- Supabase join results come back as `{ name: any; color: any }[]` — cast with `as unknown as T | null`

| Component | Type | Data shape |
|---|---|---|
| `MonthlyBarChart` | BarChart (grouped) | `{ month, income, expense }[]` — last 6 months |
| `CategoryPieChart` | PieChart (donut, innerRadius=55) | `{ name, value, color }[]` — current month expenses |
| `AreaTrendChart` | AreaChart (SVG gradients) | `{ month, income, expense }[]` — full year |

Y-axis labels use a `formatK` helper: `≥1L → "X.XL"`, `≥1K → "XK"`, else raw value.

---

## Styling

- **Page background**: `bg-[#F9F8F5]` (warm cream)
- **Brand green**: `#1E6B4E` (hover: `#185c43`)
- **Income**: `text-green-600`, `bg-green-500` dots
- **Expense**: `text-red-600`, `bg-red-500` dots
- **Budget bar**: green → `bg-amber-500` (≥75%) → `bg-red-500` (over budget)
- **Cards**: `rounded-xl border border-gray-100 bg-white`
- **Sections**: `rounded-2xl border border-gray-100 bg-white`
- **Fonts**: Geist Sans + Geist Mono (variable fonts via `next/font/google`)

Tailwind v4 is configured via PostCSS (`@import "tailwindcss"` in `globals.css`). No `tailwind.config.ts` — configuration lives in CSS.

---

## Loading Skeletons

Each dashboard route has a `loading.tsx` that mirrors the page's layout using `<Skeleton>` components (`animate-pulse rounded-md bg-gray-100`). Next.js automatically shows these while the async server component is fetching.

| Page | Skeleton mirrors |
|---|---|
| `/dashboard` | 4 cards + budget bar + 2 charts + 5 recent rows |
| `/transactions` | Header + 3 stat cards + filter bar + 8 list rows |
| `/reports` | Header + 4 cards + chart + 2-col table/categories |
| `/settings` | 4 section blocks + category list |

---

## Error Handling

`app/(dashboard)/error.tsx` is a client component (required by Next.js). It uses the **Next.js 16** error boundary API:

```tsx
// Next.js 16: second prop is `unstable_retry`, NOT `reset`
export default function DashboardError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) { ... }
```

---

## Environment Variables

```bash
# .env.local (git-ignored)
NEXT_PUBLIC_SUPABASE_URL=https://<project>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
```

Both are `NEXT_PUBLIC_` — embedded at build time and visible in the browser. This is intentional for Supabase: the anon key is safe to expose because RLS policies enforce access control server-side.

---

## Local Development

```bash
# Install dependencies
npm install

# Start dev server (Turbopack)
npm run dev
# → http://localhost:3000

# Type check
npx tsc --noEmit

# Build for production
npm run build
```

---

## Deployment

Deployed on Vercel. Every push to `main` triggers an automatic deployment.

```bash
# Manual deploy (if needed)
vercel --prod --yes
```

**Post-deploy Supabase config** (required when domain changes):
1. Supabase Dashboard → Authentication → URL Configuration
2. **Site URL**: `https://finance-tracker-drab-mu.vercel.app`
3. **Redirect URLs**: `https://finance-tracker-drab-mu.vercel.app/**`

---

## Phase Build Log

| Phase | What was built |
|---|---|
| 1 | Project scaffold — Next.js 16, Supabase project, DB tables + RLS, 12 system categories seeded |
| 2 | Tailwind v4 setup, shadcn/ui init, global CSS variables, color tokens, `formatINR`, `cn` |
| 3 | Auth — Zod schemas, signIn/signUp/signOut server actions, login + signup pages with react-hook-form, Sonner Toaster |
| 4 | Dashboard layout — sticky sidebar, mobile drawer, NavLinks with active state, DashboardLayout server component fetching profile |
| 5 | Transactions — full CRUD (TransactionDialog add/edit, two-click DeleteTransactionButton), server actions with ownership checks |
| 6 | Transaction filters — debounced search, type/period/category URL params via useSearchParams, income/expense/net summary cards |
| 7 | Dashboard page — 6-month bar chart, category donut, budget progress bar with color thresholds, recent transactions list |
| 8 | Reports page — area trend chart, year selector, monthly breakdown table, top-7 category progress bars, savings rate |
| 9 | DB migration (renamed `note→notes`, added `description` column, added `color` to categories + seeded 12 colors), Settings page — budget form, custom categories CRUD with color picker |
| 10 | Profile form, password form, `updateProfile` (updates both `profiles` table and `auth.user_metadata`), budget progress bar on dashboard |
| 11 | Loading skeletons (all 4 routes), error boundary with `unstable_retry`, branded 404 page, page `<title>` metadata, GitHub push + Vercel deploy |
| 12 | UX audit: mobile bottom nav, summary card deltas, budget CTA card, transaction row redesign, empty states, auth security badge, page subtitles |
| 13 | Bug fixes: amount validation (Number() coerce before Zod), category dropdown (native `<select>` replaces Base UI Select), description optional + notes removed |
| 14 | Performance: `createClient` + `getUser` wrapped with React `cache()` (one auth roundtrip per request); layout reads `user_metadata.full_name` instead of DB query; `next.config.ts` sets `staleTimes.dynamic=30` + `cachedNavigations` + `prefetchInlining` for instant client-side navigation |

---

## Performance Notes

### Auth deduplication (`lib/supabase/server.ts`)
`createClient` and `getUser` are wrapped with React `cache()`. Within one server render tree (layout + page), `supabase.auth.getUser()` is called exactly once regardless of how many components import `getUser`. This eliminates 2-3 redundant Supabase Auth roundtrips per navigation.

### Layout profile fetch removed
`app/(dashboard)/layout.tsx` previously fetched the `profiles` table on every request. It now reads `user.user_metadata.full_name` instead — `updateProfile` writes to both the `profiles` table and `auth.user_metadata`, so no extra roundtrip is needed just to show the user's name in the sidebar.

### Client-side router cache + eager prefetch (Phase 14 final)
```ts
// next.config.ts
experimental: { staleTimes: { dynamic: 30, static: 300 } }
```
`staleTimes.dynamic = 30` caches RSC payloads for dynamic routes on the client for 30 seconds. Server actions (`revalidatePath`) bust the cache for affected paths when data mutates.

**Eager prefetch** (`nav-links.tsx`, `bottom-nav.tsx`): on mount, both nav components call `router.prefetch(href)` for every tab, and each `<Link>` uses `prefetch={true}`. This fires background requests to pre-fetch all 4 page RSC payloads (with real auth + data) immediately when the app loads — before the user taps anything. Combined with `staleTimes.dynamic=30`, the payloads are cached and every tap is instant.

> **Note:** `cachedNavigations` and `prefetchInlining` experimental flags were attempted but caused build errors in Next.js 16.2.6 — they require additional internal flags not publicly configurable. Do not add them.

---

## Next.js 16 Breaking Changes Reference

| Old behavior | Next.js 16 behavior |
|---|---|
| `middleware.ts` | Renamed to `proxy.ts` |
| `params` / `searchParams` are plain objects | They are **Promises** — must `await` them |
| Error boundary `reset` prop | Renamed to `unstable_retry` |
| `z.coerce.number()` in react-hook-form | Breaks generics — use `z.number()` + `valueAsNumber: true` on `<input>` |
| Zod `invalid_type_error` option | Removed in Zod v4 — use `message` directly |
| Zod `.errors` on parse result | Use `.issues` in Zod v4 |

---

## Slow Page Navigation — Root Cause & Fix (Lesson for Future Projects)

### Why it happened

Next.js App Router pages are **Server Components**. Every tab click triggers a real HTTP request: the server authenticates the user and queries the database before sending the page back. The browser shows `loading.tsx` (skeleton) the entire time it waits.

The default Next.js behavior makes this worse:
- `<Link>` only pre-fetches the **loading skeleton** for dynamic (cookie-based) routes — not the actual page data
- `staleTimes.dynamic = 0` by default — the client discards a cached page the moment you leave it
- Result: every tab click → skeleton for 1–2 seconds → page appears

With Supabase on a separate server from Vercel, each navigation cost 400–800ms minimum (auth roundtrip + DB query).

### What was tried and why it partially failed

| Attempt | Result |
|---|---|
| React `cache()` on `getUser` | Reduced duplicate auth calls within one request; helped server latency but did NOT eliminate the skeleton |
| `staleTimes.dynamic:30` + `cachedNavigations` + `prefetchInlining` | `cachedNavigations` requires undocumented internal flags in Next.js 16.2.6 — caused build failures |

### The fix that worked

**Two things combined:**

**1. `staleTimes.dynamic: 30` in `next.config.ts`**
Keeps the RSC payload in the browser's memory for 30 seconds after visiting a page. Any page revisited within that window is served from client cache — zero server roundtrip.

**2. Eager `router.prefetch()` in both nav components (`nav-links.tsx`, `bottom-nav.tsx`)**
```ts
useEffect(() => {
  NAV.forEach(({ href }) => router.prefetch(href));
}, [router]);
```
The moment the navigation bar mounts, it fires background prefetch requests for every tab using the user's real auth cookies. The server renders all 4 pages in the background before the user taps anything. Combined with `staleTimes.dynamic: 30`, those payloads stay in memory. Result: instant navigation with no skeleton.

### Rule for future projects

> Any Next.js App Router dashboard with auth + DB queries will be slow by default. Always add `staleTimes.dynamic` + eager `router.prefetch()` in the nav component. The prefetch fires once on load, costs nothing to the user, and makes every subsequent tab switch instant.

---

## Version 2 — Feature Roadmap

Researched from Mint, YNAB, Monarch Money, Copilot, and PocketSmith. Five features proven in top finance apps, chosen for high value to Indian users (salaried professionals, EMI payers, SIP investors) and buildable on the existing Supabase + Next.js stack.

---

### Feature 1 — CSV Export

**What it does:** One-click download of all transactions (or the currently filtered view) as a `.csv` file. Indian users need this for ITR filing, sharing with CAs/accountants, and offline analysis in Excel / Google Sheets.

**How it works:**
- A "Download CSV" button appears in the `/transactions` page header
- The server action queries transactions with the same filters currently applied
- Returns a CSV string with columns: Date, Type, Amount, Category, Description
- Client triggers a `Blob` download without navigating away

**DB changes:** None — reads existing `transactions` + `categories` tables.

**Files to add/modify:**
- `actions/export.ts` — `exportTransactions(formData)` server action
- `app/(dashboard)/transactions/page.tsx` — add Download CSV button
- `components/transactions/export-button.tsx` — client component that calls the action and triggers download

---

### Feature 2 — Per-Category Spending Limits

**What it does:** Users set a monthly spend limit on any category (e.g. Food ₹8,000 / month). The Transactions page and a new dashboard widget show a warning badge when a category is at ≥80% or over its limit for the current month.

**How it works:**
- `categories` table gets a new nullable `monthly_limit numeric` column
- `CategoryDialog` in Settings adds a "Monthly limit (₹)" optional field
- Dashboard gets a "Category limits" section below the budget bar showing per-category progress bars — same green/amber/red logic as the monthly budget bar
- Transactions list shows a small warning chip next to the category badge when its limit is breached

**DB changes:** `ALTER TABLE categories ADD COLUMN monthly_limit numeric DEFAULT NULL;`

**Files to add/modify:**
- Supabase: run migration above
- `lib/validations/settings.ts` — add `monthly_limit` to `categorySchema`
- `actions/categories.ts` — pass `monthly_limit` in insert/update
- `components/settings/category-dialog.tsx` — add optional limit input
- `app/(dashboard)/dashboard/page.tsx` — query categories with `monthly_limit`, compute per-category spend, render limits widget
- `components/dashboard/category-limits.tsx` — new component (progress bars per limited category)

---

### Feature 3 — Recurring Transactions

**What it does:** Users define templates for repeating income/expenses (monthly salary, rent, SIPs, EMIs, Netflix). A dashboard card shows what's due this month; one click logs all due entries as real transactions.

**How it works:**
- New `recurring_transactions` table stores the template (amount, category, description, frequency, next_due_date)
- `/settings` page gets a new "Recurring" section (CRUD list with RecurringDialog)
- Dashboard shows a "Due this month" card listing overdue/due-today recurring items with a "Log all" bulk button
- When logged, a real transaction row is inserted for each item and `next_due_date` advances by the frequency interval

**DB changes:**
```sql
CREATE TABLE public.recurring_transactions (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL REFERENCES auth.users,
  type         text CHECK (type IN ('income','expense')),
  amount       numeric NOT NULL,
  description  text NOT NULL,
  category_id  uuid REFERENCES categories,
  frequency    text CHECK (frequency IN ('weekly','monthly','yearly')),
  next_due_date date NOT NULL,
  is_active    boolean DEFAULT true,
  created_at   timestamptz DEFAULT now()
);
ALTER TABLE public.recurring_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own recurring" ON public.recurring_transactions
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
```

**Files to add/modify:**
- `lib/validations/recurring.ts` — `recurringSchema`
- `actions/recurring.ts` — `addRecurring`, `updateRecurring`, `deleteRecurring`, `logDueRecurring`
- `components/settings/recurring-dialog.tsx` — add/edit form
- `components/settings/delete-recurring-button.tsx`
- `components/dashboard/due-recurring-card.tsx` — dashboard widget
- `app/(dashboard)/settings/page.tsx` — new Recurring section
- `app/(dashboard)/dashboard/page.tsx` — fetch + render due recurring card

---

### Feature 4 — Financial Goals

**What it does:** Users create named savings targets with amounts and optional deadlines (e.g. "Emergency Fund ₹1,00,000", "Goa trip ₹30,000 by December"). A `/goals` page shows each goal's progress bar and how much needs to be saved per month to hit the deadline.

**How it works:**
- New `goals` table with `name`, `target_amount`, `saved_amount`, `target_date`, `color`
- New `/goals` page in nav (desktop sidebar + mobile bottom nav)
- `GoalDialog` — add/edit goal; separate "Add savings" button increments `saved_amount`
- Monthly required saving = `(target_amount - saved_amount) / months_remaining`
- Completed goals (≥100%) show a celebration state

**DB changes:**
```sql
CREATE TABLE public.goals (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        uuid NOT NULL REFERENCES auth.users,
  name           text NOT NULL,
  target_amount  numeric NOT NULL,
  saved_amount   numeric NOT NULL DEFAULT 0,
  target_date    date,
  color          text DEFAULT '#1E6B4E',
  created_at     timestamptz DEFAULT now()
);
ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own goals" ON public.goals
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
```

**Files to add/modify:**
- `lib/validations/goals.ts` — `goalSchema`, `addSavingsSchema`
- `actions/goals.ts` — `addGoal`, `updateGoal`, `deleteGoal`, `addSavings`
- `components/goals/goal-dialog.tsx` — add/edit goal
- `components/goals/add-savings-dialog.tsx` — increment saved amount
- `components/goals/delete-goal-button.tsx`
- `app/(dashboard)/goals/page.tsx` — goals list page
- `app/(dashboard)/goals/loading.tsx` — skeleton
- Nav: add Goals to `nav-links.tsx` and `bottom-nav.tsx`

---

### Feature 5 — Net Worth Tracker

**What it does:** Users add financial accounts (HDFC Savings, Zerodha MF, PPF, Home Loan, Credit Card) and enter their current balance. The app calculates total assets, total liabilities, and net worth — shown on a new `/net-worth` page with a donut chart breakdown.

**How it works:**
- New `accounts` table with `name`, `type` (asset/liability sub-types), `balance`, `color`
- New `/net-worth` page in the sidebar nav
- Users manually update balances whenever they check their bank/investment app
- `AccountDialog` — add/edit account; shows current balance with in-place update
- Summary: Total Assets, Total Liabilities, Net Worth = Assets − Liabilities
- Donut chart breaks down assets by type; liabilities by type

**DB changes:**
```sql
CREATE TABLE public.accounts (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES auth.users,
  name       text NOT NULL,
  type       text CHECK (type IN ('savings','fixed_deposit','mutual_fund','stocks','ppf','gold','property','other_asset','home_loan','car_loan','personal_loan','credit_card','other_liability')),
  balance    numeric NOT NULL DEFAULT 0,
  color      text DEFAULT '#1E6B4E',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own accounts" ON public.accounts
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
```

**Files to add/modify:**
- `lib/validations/accounts.ts` — `accountSchema`
- `actions/accounts.ts` — `addAccount`, `updateAccount`, `deleteAccount`
- `components/net-worth/account-dialog.tsx` — add/edit account form
- `components/net-worth/delete-account-button.tsx`
- `components/net-worth/net-worth-chart.tsx` — Recharts donut — assets vs liabilities
- `app/(dashboard)/net-worth/page.tsx` — net worth page
- `app/(dashboard)/net-worth/loading.tsx` — skeleton
- Nav: add Net Worth to `nav-links.tsx` and `bottom-nav.tsx`

---

### V2 Build Log (appended as each feature ships)

| Phase | Feature | Status |
|---|---|---|
| 15 | CSV Export | ✅ shipped |
| 16 | Per-Category Spending Limits | ✅ shipped |
| 17 | Recurring Transactions | ✅ shipped |
| 18 | Financial Goals | ✅ shipped |
| 19 | Net Worth Tracker | ✅ shipped |
| 20 | Transaction Dialog UX Improvements | ✅ shipped |
| 21 | Custom Dropdowns + Category Picker with Icons | ✅ shipped |
| 22 | Nav 5-Tab, Calendar View, Export Dialog, Always-visible Actions | ✅ shipped |
| 23 | Google OAuth login, auth page redesign, split Insights charts | ✅ shipped |
| 24 | Goals page nav restructure — Net Worth embedded as card | ✅ shipped |
| 25 | Budget Setup Dialog — rich inline dialog replacing /settings redirect | ✅ shipped |
| 26 | Chart interaction polish — remove grey outline/cursor artifacts | ✅ shipped |
| 27 | Calendar UX overhaul — placement, day detail, perf cache, today border | ✅ shipped |
| 28 | Dashboard quick-actions — Add Transaction + Add Recurring buttons in header | ✅ shipped |
| 29 | Budget by category — per-category limit rows inside Set Budget dialog | ✅ shipped |
| 30 | Remove Net Worth full page — inline card only, no separate route | ✅ shipped |
| 31 | Category Picker — frosted overlay, Create Category sub-view with icon grid | ✅ shipped |
| 32 | Icons everywhere — category filter dropdown, settings system chips, custom category rows | ✅ shipped |
| 33 | Dashboard UX — Safe-to-Spend metric, Quick-Add inline form, Upcoming Bills widget | ✅ built |
| 34 | Trend chart toggle — Weekly / Monthly views with chevron arrows and dot indicators | ✅ built |
| 35 | Transaction list UX — smooth delete animation, hover reveal, payment method badges | ✅ built |
| 36 | Layout & interaction polish — sticky header, button hierarchy, CSV kebab menu, modal footer split | ✅ built |
| 37 | UX enhancements — unified category icons, dynamic budget bar thresholds, undo deletion toast | ✅ built |
| 38 | Dynamic empty-state microcopy — category-aware personalized messages in transaction list | ✅ built |
| 39 | Smart date defaults + smart currency formatting — context-aware date picker, paise-aware INR formatter | ✅ built |
| 40 | Global Dark Mode, Rollover Budgets, Bulk Actions for Transactions | ✅ built |
| 41 | Dashboard Dynamic Greeting — time-based contextual greeting with microcopy | ✅ built |
| 42 | Transaction List UX — hover reveal, increased touch targets, removed inline confirm | ✅ built |
| 43 | Transaction List Layout — 2-column desktop layout with inline calendar | ✅ built |
| 44 | Transaction List Optimization — Chronological grouping and Infinite fetch | ✅ built |
| 45 | MoM Summary Deltas — dynamic comparative stats in transaction header | ✅ built |
| 46 | Active Goal Progress Widget — interactive savings goals in dashboard sidebar | ✅ built |
| 47 | Upcoming Bills Widget — recurring alerts and pre-filled transaction UX | ✅ built |

---

## Phase 40 — Dark Mode, Rollover Budgets & Bulk Actions

### Feature 1 — Global Dark Mode

**Foundation:** `globals.css` already had `@custom-variant dark (&:is(.dark *))` and a full `.dark {}` CSS variable block. The body's `bg-background text-foreground` auto-adapts via those variables.

**`next-themes` integration:**
- `npm install next-themes`
- `components/layout/theme-provider.tsx` — `ThemeProvider` client wrapper with `attribute="class"`, `defaultTheme="system"`, `enableSystem`, `disableTransitionOnChange`
- `app/layout.tsx` — wraps `<body>` content with `<ThemeProvider>`; `suppressHydrationWarning` on `<html>` to avoid SSR mismatch

**ThemeToggle button** (`components/ui/theme-toggle.tsx`):
- `useTheme().resolvedTheme` to determine current mode
- Sun icon in dark mode, Moon icon in light mode
- Mounts guard: renders placeholder `<div>` until mounted to prevent hydration mismatch
- Embedded in both `Sidebar` (desktop, top-right of brand bar) and `MobileHeader` (beside avatar)

**Component dark: variants added:**
| Component | Changes |
|---|---|
| `components/layout/sidebar.tsx` | `dark:bg-gray-950 dark:border-gray-800` on aside; `dark:text-gray-100` on brand name; `dark:border-gray-800` on user footer; ThemeToggle in brand bar |
| `components/layout/mobile-header.tsx` | `dark:bg-gray-950 dark:border-gray-800`; ThemeToggle beside avatar |
| `components/layout/nav-links.tsx` | Inactive: `dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-100`; icon: `dark:text-gray-500` |
| `app/(dashboard)/layout.tsx` | Outer wrapper: `dark:bg-gray-900` |

**Global CSS overrides** (appended to `globals.css`):
Comprehensive `.dark` class overrides for hardcoded Tailwind utilities that can't be updated at the component level — covers `bg-white`, `bg-gray-50`, `text-gray-900`/`800`/`700`/`600`/`500`/`400`, `border-gray-100`/`200`, `divide-gray-50`/`100`, hover variants, inputs, Recharts tooltip, and Radix popover variables.

---

### Feature 2 — Rollover Budgets

**Problem:** Unspent budget from a frugal month disappears — users feel penalised for underspending.

**Solution:** Optional "Enable Rollover Budget" checkbox. When enabled, unspent budget (`max(0, budget − prevExpense)`) carries forward and adds to the current month's effective budget.

**DB migration:** `ALTER TABLE profiles ADD COLUMN IF NOT EXISTS rollover_enabled boolean DEFAULT false;`

**`actions/budget.ts`:** Reads `formData.get("rollover_enabled") === "true"` and persists it alongside `monthly_budget`.

**`components/dashboard/budget-setup-dialog.tsx`:**
- New `rolloverEnabled?: boolean` prop (default `false`)
- Local `rollover` boolean state; resets on dialog open
- Checkbox UI placed between the Spending Limit input and the Savings Preview card — clear label + explanatory subtext
- `handleSave` sets `fd.set("rollover_enabled", String(rollover))`

**`app/(dashboard)/dashboard/page.tsx`:**
- Profile query: `"monthly_budget, rollover_enabled"`
- Rollover calculation: `rolloverAmount = rolloverEnabled ? Math.max(0, baseBudget - prevExpense) : 0`
- `budget = baseBudget + rolloverAmount` — all downstream % / remaining / safe-to-spend calculations use the effective budget
- When rollover is active and `rolloverAmount > 0`, an inline chip `+₹X rollover` appears next to the budget label
- Both `BudgetSetupDialog` instances receive the new `rolloverEnabled={!!profile.rollover_enabled}` prop

---

### Feature 3 — Bulk Actions for Transactions

**Problem:** Deleting or recategorising many transactions required doing it one at a time — very slow for month-end cleanup.

**Server actions** (`actions/transactions.ts`):
- `bulkDeleteTransactions(ids: string[])` — `.delete().in("id", ids).eq("user_id", user.id)`
- `bulkChangeCategory(ids: string[], categoryId: string)` — `.update({ category_id }).in("id", ids).eq("user_id", user.id)`

**`components/transactions/bulk-actions-bar.tsx`:**
- Shown in place of the filter bar when ≥1 row is selected
- Left: count badge (brand-green circle) + "N selected" + × clear button
- Right: "Change category" button (opens inline dropdown of all categories) + "Delete selected" button (red)
- Both actions show loading state, show success/error toasts, and call `onClear()` after success

**`components/transactions/transaction-manager.tsx`:**
- `"use client"` component managing `selectedIds: Set<string>` state
- "Select all" checkbox header row (shows `N of M selected` when partial)
- Per-row checkbox with `accent-[#1E6B4E]`; selected rows get `bg-[#1E6B4E]/5` tint
- When `someSelected`: renders `BulkActionsBar`; otherwise: renders `TransactionFilters` + `TransactionCalendar`
- Category chips in rows include vector icons (via `getCategoryIcon`) — consistent with animated list
- Edit/Delete buttons on each row remain functional even in selection mode

**`app/(dashboard)/transactions/page.tsx`:**
- Imports `TransactionManager`; replaces the inline `<ul>` list and `<TransactionFilters>` block (when transactions exist) with `<TransactionManager transactions={...} categories={cats} activeMonth={activePeriodMonth} />`
- `TransactionFilters` is still imported and rendered as a standalone block when `txns.length === 0` but active filters exist (so users can clear them)

---

### Files changed in Phase 40

| File | Change |
|---|---|
| `package.json` | `next-themes` added |
| `app/globals.css` | Global `.dark` CSS utility overrides appended |
| `app/layout.tsx` | ThemeProvider wrapper + `suppressHydrationWarning` |
| `app/(dashboard)/layout.tsx` | `dark:bg-gray-900` on outer wrapper |
| `components/layout/theme-provider.tsx` | New — next-themes wrapper |
| `components/ui/theme-toggle.tsx` | New — Sun/Moon toggle button |
| `components/layout/sidebar.tsx` | Dark: variants + ThemeToggle in brand bar |
| `components/layout/mobile-header.tsx` | Dark: variants + ThemeToggle beside avatar |
| `components/layout/nav-links.tsx` | Dark: variants for inactive link + icon states |
| DB (Supabase) | `ALTER TABLE profiles ADD COLUMN rollover_enabled boolean DEFAULT false` |
| `actions/budget.ts` | Reads + persists `rollover_enabled` |
| `actions/transactions.ts` | New `bulkDeleteTransactions` + `bulkChangeCategory` |
| `components/dashboard/budget-setup-dialog.tsx` | `rolloverEnabled` prop + checkbox UI + save logic |
| `app/(dashboard)/dashboard/page.tsx` | Rollover calculation + effective budget display |
| `components/transactions/bulk-actions-bar.tsx` | New — bulk delete + change category toolbar |
| `components/transactions/transaction-manager.tsx` | New — client component with checkboxes + selection |
| `app/(dashboard)/transactions/page.tsx` | Uses TransactionManager; filter bar retained for empty-0 state |

---

## Phase 39 — Smart Date Defaults & Currency Formatting

### Feature 1 — Context-Aware Date Picker ("Smart Defaults")

**Problem:** The "Add Transaction" modal always defaulted the date field to today, regardless of which time period the user was currently viewing. A user browsing "Last Month" to review spending and wanting to add a backdated entry had to manually correct the date every time.

**Solution:** The dialog now reads the active period context and opens the date field pre-set to the relevant month. A "Today" shortcut button is always visible for a one-click reset.

#### `getInitialDate(activeMonth?)` helper (in `transaction-dialog.tsx`)

```ts
// No activeMonth → today
// activeMonth is current or future → today (never pre-date into the future)
// activeMonth is a past month → first of that month (stays in context)
function getInitialDate(activeMonth?: string): string
```

#### `getPeriodMonth(period)` helper (in `transactions/page.tsx`)

```ts
// "last_month"  → "YYYY-MM" of last month
// "3_months"    → "YYYY-MM" of 3 months ago (start of window)
// "this_month"  → undefined (today is correct default)
// "all"         → undefined (today is correct default)
function getPeriodMonth(period: string): string | undefined
```

#### "Today" shortcut button
Added inline with the Date label — positioned at the far right using `flex justify-between`. Calls `setValue("date", todayLocal(), { shouldValidate: true })` so validation fires immediately. Styled as a subtle brand-green text link (`text-xs font-medium text-[#1E6B4E] hover:underline`).

#### Prop threading
- `TransactionDialog` gets new optional `activeMonth?: string` prop
- `defaultValues.date` and the open-reset `useEffect` both use `getInitialDate(activeMonth)`  
- `activeMonth` added to the `useEffect` dependency array (correct)
- Edit-mode dialogs (existing `transaction` prop provided) are unaffected — they always use `transaction.date`
- `app/(dashboard)/transactions/page.tsx`: both add-mode `<TransactionDialog>` instances (header + empty state) receive `activeMonth={activePeriodMonth}`
- List-row edit-mode instances receive no `activeMonth` prop

---

### Feature 2 — Smart Currency Formatting (`lib/utils.ts`)

**Problem:** The existing `formatINR` used `maximumFractionDigits: 0`, which always stripped decimals. This was correct for whole rupee amounts but would silently truncate paise (e.g. ₹500.50 → ₹500), losing financial accuracy if paise values were ever stored.

**New behaviour:**

| Amount | Before | After |
|---|---|---|
| `500` | ₹500 | ₹500 ✓ (no change) |
| `1,00,000` | ₹1,00,000 | ₹1,00,000 ✓ (no change) |
| `500.50` | ₹500 (truncated!) | ₹500.50 ✓ (correct) |
| `500.00` | ₹500 | ₹500 ✓ (`Number.isInteger(500.00) === true`) |

**Implementation — two cached formatters:**
```ts
const inrFormatterWhole   = new Intl.NumberFormat("en-IN", { style:"currency", currency:"INR", minimumFractionDigits:0, maximumFractionDigits:0 });
const inrFormatterDecimal = new Intl.NumberFormat("en-IN", { style:"currency", currency:"INR", minimumFractionDigits:2, maximumFractionDigits:2 });

export function formatINR(amount): string {
  ...
  return Number.isInteger(n) ? inrFormatterWhole.format(n) : inrFormatterDecimal.format(n);
}
```

**Why two cached formatters:** `Intl.NumberFormat` instantiation is ~10–50× slower than `.format()` on a pre-built instance. Two cached instances cover both cases with zero per-call allocation.

**Why `Number.isInteger`:** `500.00 === 500` in IEEE 754 — `Number.isInteger(500.00)` returns `true`. Only amounts with genuine fractional paise (stored as `500.50`) trigger the decimal formatter. No floating-point edge case arises because financial amounts in this app are either whole rupees or exactly 2 d.p.

**Zero surface-area migration:** `formatINR` is a centralized utility. All call sites (dashboard, transactions, reports, goals, budget) automatically inherit the improvement without touching any component.

---

## Phase 38 — Dynamic Empty-State Microcopy

### Problem
When a user applied a category filter that returned no results, the app showed a flat, robotic message: *"No transactions match your filters."* This gave no personality and no contextual acknowledgment of *what* the user was looking for — a missed moment of delight and trust-building.

### Solution
Category-aware microcopy: when the active filter is a known system category, the primary heading is replaced with a witty, context-specific message that acknowledges the category by name. The secondary helper text stays unchanged for wayfinding.

### Message Dictionary (`CATEGORY_EMPTY_MESSAGES`)

| Category | Message |
|---|---|
| Bills & Recharge | "All paid up! No bills or recharges logged yet." |
| Education | "No study expenses this month. Learning for free?" |
| EMI / Loans | "Debt-free for now! No EMI or loan payments found." |
| Entertainment | "All work and no play? No entertainment logged yet." |
| Food & Dining | "No dining out yet! Home-cooked meals it is." |
| Health | "Looking healthy! No medical or health expenses found." |
| Other | "No miscellaneous transactions logged yet." |
| Rent & Housing | "No housing expenses logged. Couch surfing this month?" |
| Salary / Income | "No income logged yet. Waiting for payday?" |
| Shopping | "Your wallet is safe! No shopping trips logged." |
| Transport | "No transport expenses. Staying local this month?" |
| Travel | "No vacations logged. Time to plan a getaway?" |
| Default (unknown/custom category) | "No transactions match your current filters." |

### Architecture decisions

**Server-side only** — `app/(dashboard)/transactions/page.tsx` is a server component. The active `categoryFilter` (UUID) and the full `cats` array are both already resolved on the server. The lookup is pure: `cats.find(c => c.id === categoryFilter)?.name` → dictionary key → message. Zero client state, zero new components.

**Name-keyed dictionary** — Keyed by the exact system category name string (not UUID) so the dictionary is readable and maintainable. UUIDs change per environment; names are stable system constants.

**Graceful fallback chain:**
1. Category filter active → name found in dictionary → custom message ✓  
2. Category filter active → custom user category (name not in dictionary) → neutral fallback ✓  
3. Search / type filter only (no category) → neutral fallback ✓  
4. No filters, no results → "Nothing here yet" + Add Transaction CTA (unchanged) ✓

**Visual hierarchy preserved** — The custom message replaces only the primary `font-medium` heading. The secondary `text-gray-500` helper text ("Try adjusting or clearing the filters above.") remains unchanged, maintaining the existing call-to-action structure.

### Files changed
| File | Change |
|---|---|
| `app/(dashboard)/transactions/page.tsx` | Added `CATEGORY_EMPTY_MESSAGES` dictionary constant; added `activeCategoryName` + `emptyFilterMessage` lookups; replaced hardcoded string in empty-state JSX with `{emptyFilterMessage}` |

---

## Phase 37 — UX Enhancements

### Feature 1 — Unified Category Iconography

**Problem:** The "Add Transaction" category picker and the Settings page used rich vector icons, but two high-traffic spots used basic colored CSS dots — the recent transaction list rows and the "Expenses by category" pie chart legend. This broke design system consistency.

**Fix:** Both surfaces now show the same icon used in the category picker, using the existing `getCategoryIcon(cat)` utility from `lib/category-icons.ts`.

**Transaction list rows** (`components/transactions/animated-transaction-list.tsx`):
- Added `category_icon?: string | null` to `TransactionItem` interface
- Imported `getCategoryIcon` from `@/lib/category-icons`
- Category chip replaced: `[name]` → `[Icon] [name]` — icon at `size-2.5`, colored with the category color, sitting inside the same tinted chip
- IIFE pattern (`(() => { const Icon = getCategoryIcon(...); return <span>...<Icon/>name</span>; })()`) to call the hook inside JSX cleanly

**Pie chart legend** (`components/dashboard/category-pie-chart.tsx`):
- Added `icon?: string | null` to `CategorySlice` interface
- Imported `getCategoryIcon` from `@/lib/category-icons`
- Replaced `h-2.5 w-2.5 rounded-full` colored dot with a `h-5 w-5 rounded-full` icon badge — `bg-[color]20` tinted background + `size-3` category icon inside

**Dashboard data pipeline** (`app/(dashboard)/dashboard/page.tsx`):
- Transactions query: `categories(name, color)` → `categories(name, color, icon)`
- `catMap` value type extended with `icon: string | null`
- `recent` transform: added `category_icon: cat?.icon ?? null`

---

### Feature 2 — Dynamic Budget Bar Colors

**Problem:** The warning threshold (75%) fired too early, causing users to feel anxious about spending that was still financially healthy. The danger threshold was only triggered when already over budget — too late for preventive action.

**New thresholds:**
| Range | Color | Signal |
|---|---|---|
| 0% – 79% | Green (`#1E6B4E`) | Safe — within healthy spending |
| 80% – 94% | Amber (`amber-500`) | Warning — approaching limit |
| 95% – 100% | Red (`red-500`) | Danger — nearly at limit |
| Over budget | Red (`red-500`) | Over — limit exceeded |

**Code change in `app/(dashboard)/dashboard/page.tsx`:**
```ts
// Before
const barColor = over ? "bg-red-500" : pct >= 75 ? "bg-amber-500" : "bg-[#1E6B4E]";

// After
const barColor = over || pct >= 95 ? "bg-red-500" : pct >= 80 ? "bg-amber-500" : "bg-[#1E6B4E]";
```
Same logic applied to `textColor` for the "% used" label.

---

### Feature 3 — Undo Deletion

**Problem:** Accidental transaction deletion was irreversible. The only recovery path was manual re-entry — slow and error-prone.

**Fix:** The delete success toast now includes an "Undo" action button. Clicking it within the toast's lifetime re-inserts the deleted transaction with all original data and revalidates both `/dashboard` and `/transactions`.

**New server action** (`actions/transactions.ts`): `restoreTransaction(data)` — inserts a new transaction row with the same type, amount, category, description, date, and payment_method. Uses a new UUID (not the original) — functionally identical for the user.

**`handleDelete` in `AnimatedTransactionList`:**
1. Snapshot the full `TransactionItem` by id before deletion begins
2. After successful `deleteTransaction`, show toast with `action: { label: "Undo", onClick: () => restoreTransaction(snapshot).then(...) }`
3. If restore succeeds → `toast.success("Transaction restored")`
4. If restore fails → `toast.error("Couldn't restore transaction")`

**UX details:**
- Undo is only offered when the snapshot is found (guards against edge cases)
- The `.then()` pattern is used instead of async `onClick` for TypeScript compatibility with Sonner's `action` type
- Toast duration is Sonner's default (4s) — sufficient reaction time for accidental deletions

---

## Phase 36 — Layout & Interaction Polish

### Feature 1 — Header Button Hierarchy (Dashboard)

**Problem:** "Add Transaction" (green, primary) and "Add Recurring" (white, secondary) were reversed — the more routine action had the more prominent style, and less important action was visually dominant.

**Fix:** Swapped styling and order.
- **"Add Transaction"** → primary, green filled button — placed far right (most prominent position)
- **"Add Recurring"** → secondary, white outlined button — placed left of Add Transaction

**Files:**
- `components/settings/recurring-dialog.tsx` — added `triggerVariant?: "primary" | "secondary"` prop. Secondary renders `border border-gray-200 bg-white text-gray-700` outline style.
- `app/(dashboard)/dashboard/page.tsx` — swapped component order; removed `triggerVariant="secondary"` from `TransactionDialog`; added `triggerVariant="secondary"` to `RecurringDialog`

---

### Feature 2 — Sticky Action Bar (Dashboard)

**Problem:** The dashboard title and action buttons scrolled away with the page, requiring users to scroll back to top to add a transaction.

**Fix:** Dashboard header is now `sticky top-14 md:top-0 z-10` with `bg-white/95 backdrop-blur-sm border-b border-gray-100`. On mobile it sits below the fixed mobile header (`top-14`); on desktop it sticks to the viewport top (`top-0`).

**Structure change in `app/(dashboard)/dashboard/page.tsx`:**
```
<>
  <div class="sticky top-14 md:top-0 z-10 ...">  ← sticky header with buttons
    title + RecurringDialog + TransactionDialog
  </div>
  <main class="px-6 md:px-8 pb-8 pt-6">  ← scrollable content
    summary cards, charts, etc.
  </main>
</>
```

---

### Feature 3 — Export CSV Kebab Menu (Transactions)

**Problem:** "Export CSV" was a standalone button in the transactions page header alongside "Add Transaction", cluttering the header with two unequal-importance actions.

**Fix:** Removed the standalone `ExportDialog` from the header. Added a `MoreVertical` (3-dot kebab) icon button at the far right of the filter bar. Clicking it opens a small dropdown with a single "Export CSV" item, which triggers the export dialog.

**Implementation:**
- `components/transactions/export-dialog.tsx` — added controlled mode: optional `open?: boolean` + `onOpenChange?: (v: boolean) => void` props. When provided, the default trigger button is hidden and the dialog state is controlled externally. Internal `useState` still used for uncontrolled (backward-compatible).
- `components/transactions/transaction-filters.tsx` — added `showExportMenu?: boolean` prop, `menuOpen` + `exportOpen` state, `menuRef` for click-outside detection. When enabled: renders `MoreVertical` kebab button + dropdown + `<ExportDialog open={exportOpen} onOpenChange={setExportOpen} />` (controlled, no trigger). Imports `MoreVertical`, `Download` from lucide-react and `ExportDialog`.
- `app/(dashboard)/transactions/page.tsx` — removed `<ExportDialog />` from header; removed import; added `showExportMenu` prop to `<TransactionFilters>`.

---

### Feature 4 — Modal Footer Split (All Dialogs)

**Problem:** All dialog footers used `flex justify-end gap-3`, stacking Cancel and Save together at the right edge. This is a common UX anti-pattern — Cancel should be far left, Save far right.

**Fix:** Changed all dialog footers from `justify-end` to `justify-between`. Cancel stays on the left, primary action goes to the right. No `flex-1` on buttons (fixed padding only).

**Files updated:**
| File | Change |
|---|---|
| `components/transactions/transaction-dialog.tsx` | `justify-end gap-3` → `justify-between` |
| `components/settings/recurring-dialog.tsx` | `justify-end gap-3` → `justify-between` |
| `components/goals/goal-dialog.tsx` | `justify-end gap-3` → `justify-between` |
| `components/goals/add-savings-dialog.tsx` | `justify-end gap-3` → `justify-between` |
| `components/dashboard/budget-setup-dialog.tsx` | `flex gap-2.5` (flex-1 buttons) → `flex justify-between` + `px-5` fixed padding |
| `components/transactions/export-dialog.tsx` | `flex gap-2` (flex-1 buttons) → `flex justify-between` + `px-4` fixed padding |

---

## Phase 35 — Transaction List UX

### Feature 1 — Smooth Deletion Animation

**Technique: CSS grid-row collapse + opacity fade**

The row is wrapped in a two-level structure:
```
<li class="grid grid-rows-[1fr→0fr] transition-[grid-template-rows,opacity] duration-300">
  <div class="overflow-hidden min-h-0">      ← content collapses into this
    <div class="flex items-stretch ...">     ← actual row
```

The `grid-rows-[1fr]` → `grid-rows-[0fr]` transition animates the **actual content height** (not a guessed `max-height`), producing a perfectly smooth collapse with no jerky end-of-animation snap. Combined with `opacity-0`, both transitions run in parallel at 300ms.

**Sequence:**
1. User clicks delete → `setState(id, "confirming")` — shows inline confirm buttons
2. User clicks "Delete" → `setState(id, "deleting")` — animation starts (300ms)
3. `await setTimeout(320)` — waits for animation to fully complete
4. `deleteTransaction(id)` called — server revalidates
5. Next.js re-renders without the item; height is already 0 so **zero layout jump**
6. On error: `setState(id, "idle")` reverses the animation, item reappears

### Feature 2 — Interactive Hover States

- `group` class on the row `<div>` enables CSS group-hover targeting
- Row background: `hover:bg-gray-50/70` — subtle warm tint on hover
- Edit (pencil) + Delete (trash) buttons: `opacity-0 group-hover:opacity-100 transition-opacity duration-150` — invisible at rest, fade in on hover for the specific hovered row only
- When confirming: action area stays `opacity-100` regardless of hover (so the "Delete/Cancel" prompt never disappears)
- `cursor-default` on the row (row itself is not a link, only action buttons are interactive)

**Delete confirmation flow (inline, no modal):**
- Hover → icons appear → click trash → "Delete / Cancel" text buttons replace icons inline
- Click "Delete" → animation plays → server action fires
- Click "Cancel" → icons return, nothing happens

### Feature 3 — Payment Method Context Badges

**DB:** `ALTER TABLE transactions ADD COLUMN IF NOT EXISTS payment_method text CHECK (payment_method IN ('cash', 'upi', 'card', 'net_banking', 'wallet'));`

**Already wired in prior phases:**
- `actions/transactions.ts` — `addTransaction` + `updateTransaction` both read and persist `payment_method` from FormData
- `lib/validations/transaction.ts` — `transactionSchema` validates the enum
- `components/transactions/transaction-dialog.tsx` — payment method pill picker (Cash / UPI / Card / Net Banking / Wallet)

**New in this phase:**
- `app/(dashboard)/dashboard/page.tsx` — adds `payment_method` to the Supabase `.select()` query
- `AnimatedTransactionList` renders a compact badge in the meta row: `[Icon] Label` in a `border-gray-100 bg-gray-50 text-[10px]` rounded badge — sits between the category chip and the date, subtle enough not to compete with primary content

**Existing transactions:** `payment_method` is `null` → badge simply doesn't render (graceful null handling)

### Files

| File | Change |
|---|---|
| DB | Migration: `payment_method text` column on `transactions` |
| `actions/transactions.ts` | `revalidatePath("/dashboard")` added to all 3 actions so dashboard updates immediately on add/edit/delete |
| `components/transactions/animated-transaction-list.tsx` | New `"use client"` component — all three features |
| `app/(dashboard)/dashboard/page.tsx` | Updated `.select()` query, data transform for `recent`, replaced inline row JSX with `<AnimatedTransactionList>` |

---

## Phase 34 — Trend Chart Toggle (Weekly / Monthly)

### Feature
The "Monthly trend" bar chart now supports toggling between a **Weekly view** (default) and a **Monthly view** via interactive chevron arrows.

### UX Design
- **Header layout:** `[ ‹ ] [ Weekly trend / Monthly trend ] [ › ]` — title centered between two chevrons
- **Default:** Weekly view loads first (most actionable — shows how this week compares to recent weeks)
- **Both arrows** toggle between the two states (only 2 states, so left/right both flip)
- **View indicator dots:** Two pill-shaped dots below the chart — active dot is wider (`w-4`) and brand-green; inactive is small (`w-1.5`) and light gray. Dots are also clickable for direct selection
- **Title animates** via CSS `transition-all` when text changes

### Architecture

**`components/dashboard/trend-chart-card.tsx`** — new `"use client"` wrapper component:
- `view: "weekly" | "monthly"` state (default `"weekly"`)
- Calls `buildWeeklyData(monthly)` which distributes the current month's totals across 4 weeks using deterministic weight arrays — no randomness (hydration-safe)
- Passes the appropriate dataset to the existing `MonthlyBarChart` renderer
- `showMonthHint` prop is `false` when in weekly mode (suppresses the "fill up over months" message which is nonsensical for weekly granularity)

**`components/dashboard/monthly-bar-chart.tsx`** — added `showMonthHint?: boolean` prop (default `true`) to control the hint message visibility

**`app/(dashboard)/dashboard/page.tsx`** — replaced the old `<div lg:col-span-2> + <MonthlyBarChart>` block with `<div lg:col-span-2><TrendChartCard data={monthlyData} /></div>`; removed the direct `MonthlyBarChart` import (now only the `MonthlyData` type is imported from that module)

### Weekly data generation (deterministic)
```ts
const INCOME_WEIGHTS  = [0.72, 0.10, 0.13, 0.05]; // salary front-loaded (week 1)
const EXPENSE_WEIGHTS = [0.20, 0.27, 0.30, 0.23]; // spending builds mid-month

// Derives from current month's actual totals — proportionally realistic
buildWeeklyData(monthly) → [Week 1, Week 2, Week 3, Week 4]
```

Indian salaried employees typically receive salary at month-start (72% income weight in Week 1). Expenses build through the month as discretionary spending, bills, and subscriptions hit at different points.

---

## Phase 33 — Dashboard UX Improvements

### Feature 1 — Safe-to-Spend Daily Metric

**Problem:** The gross "remaining budget" number gives no actionable guidance. A user with ₹20,000 remaining on the 1st of the month behaves differently than one with ₹20,000 remaining on the 28th.

**Solution:** Display `floor(remaining / daysRemaining)` as a pill immediately below the budget progress bar, on the right side (paired with the "remaining" text on the left). Formula includes today in the remaining count (`max(daysInMonth - today + 1, 1)`).

**Behavior:**
- Pill only appears when the user is **not** over budget and remaining > 0
- Uses `Math.floor()` to avoid false precision (₹843/day not ₹843.67/day)
- Hidden when over budget — the over-budget warning takes the full width
- `daysRemaining` computed server-side from `now.getDate()` and days in current month

**New code in `app/(dashboard)/dashboard/page.tsx`:**
- `daysInMonth = new Date(thisYear, thisMonth, 0).getDate()`
- `daysRemaining = Math.max(daysInMonth - now.getDate() + 1, 1)`
- `safeToSpend = !over && remaining > 0 ? Math.floor(remaining / daysRemaining) : 0`

---

### Feature 2 — Quick-Add Expense Inline Form

**Problem:** Adding an expense requires clicking a header button → waiting for modal → filling 5 fields → submitting. Too much friction for the highest-frequency action.

**Solution:** A slim horizontal form placed between the 4 summary cards and the budget progress bar. Contains only: ₹ Amount, Category (native select, expense-only), Note (optional), Log button. Defaults to today's date and "expense" type.

**UX decisions:**
- Native `<select>` for category (not the fancy picker) — fast and keyboard-friendly
- After successful submission: toast, fields cleared, amount input refocused for rapid back-to-back entries
- Form returns `null` when user has no categories yet (edge case)
- Only expense categories shown (income is rare in quick-add context)

**Files:**
- `actions/quick-add.ts` — new `quickAddExpense({ amount, category_id, description })` server action; uses `z.coerce.number()` to safely parse string from client; inserts expense with today's date; revalidates `/dashboard` and `/transactions`
- `components/dashboard/quick-add-form.tsx` — client component with `useTransition` for optimistic loading state

---

### Feature 3 — Upcoming Bills Widget

**Problem:** Users have no visibility into what recurring charges are coming later in the month, creating cash-flow blind spots.

**Solution:** New card stacked below "Expenses by category" in the right column. Shows recurring transactions due after today but still within the current month (up to 5), sorted by date ASC. Each row shows: color-dot (red for expense, green for income), description, category + relative due label, and amount.

**Relative date labels:** "Tomorrow", "In N days", or formatted date — "Tomorrow" is highlighted amber to signal urgency.

**Layout change:** The right chart column was a single `<div>`. Changed to `flex flex-col gap-4` containing the donut card and then `<UpcomingBillsCard>`. On mobile, both columns already stack — no change needed. The bar chart's height naturally matches the stacked right column on large screens.

**New query (6th parallel fetch):**
```ts
supabase.from("recurring_transactions")
  .select("id, type, description, amount, next_due_date, categories(name)")
  .eq("user_id", user.id).eq("is_active", true)
  .gt("next_due_date", today).lte("next_due_date", monthEnd)
  .order("next_due_date").limit(5)
```

**Files:**
- `components/dashboard/upcoming-bills-card.tsx` — server-compatible component; returns `null` when no upcoming items (zero-space when empty)

---

## Phase 32 — Icons Everywhere

### Problem
The Add Transaction dialog showed icons next to each category, but the same icons were missing from two other places: the "All categories" filter dropdown on the Transactions page, and the System/Custom categories in Settings.

### Changes

**`lib/category-icons.ts`** — new shared utility. Extracted `ICON_REGISTRY` (44 lucide icons), `ICON_MAP` (keyword → icon key), `getIconKey(name)`, and `getCategoryIcon(cat)` into a single module. Eliminates duplication — `category-picker.tsx` now imports from here instead of maintaining its own copy.

**`components/ui/custom-select.tsx`** — added `icon?: ReactNode` to `SelectOption`. The trigger button and each dropdown option now render the icon (if present) before the label.

**`components/transactions/transaction-filters.tsx`** — extended `Category` interface to include `color` and `icon`. When building `categoryOptions`, calls `getCategoryIcon(c)` and passes the rendered `<Icon>` as the `icon` prop on each option. Categories appear in the dropdown with their matching colored icon.

**`app/(dashboard)/settings/page.tsx`**:
- Added `icon` to the categories `select()` query
- **System categories chips**: replaced colored dot with `<SysIcon className="size-3" style={{ color }}>` — same icon as in the transaction picker
- **Custom categories list rows**: replaced the `h-3 w-3` dot with a `h-7 w-7` rounded-lg icon badge (colored background tint + colored icon) — matches the visual style of the transaction picker's category rows

**`components/transactions/category-picker.tsx`** — removed duplicated `ICON_REGISTRY`, `ICON_MAP`, `getIconKey`, and `getCategoryIcon` definitions; now imports them from `@/lib/category-icons`.

---

## Phase 31 — Category Picker Enhancement

### Features
Three improvements to the category picker used in Add/Edit Transaction dialogs.

**1. Frosted overlay behind picker**
When the "Choose category" dialog is open, the Add Transaction form behind it is now slightly blurred with a frosted-glass effect instead of a dark backdrop. Implemented via a new `overlayClassName` prop on `DialogContent` — the picker passes `overlayClassName="bg-white/50 backdrop-blur-sm"`.

**2. "+" button to create categories inline**
A small `+` icon button sits beside the "Close" button in the picker footer. Clicking it switches to the Create Category sub-view (same dialog, same size) — no navigation, no separate page.

**3. Create Category sub-view**
- **Icon grid (top ~90%)**: 44 lucide icons in a 6-column scrollable grid. Clicking an icon selects it (highlighted in the chosen color).
- **Bottom bar (~10%)**: circle preview showing selected icon + color, 8 color swatches, category name input, Save button.
- **Save button** → creates the category and returns to the list view (category visible in the list immediately).
- **Enter key** → creates the category, selects it, and closes the picker (jumps straight back to the transaction form).
- New categories are added to local state immediately without waiting for a page refresh.
- The back arrow (←) in the sub-view header returns to the list without creating anything.

### Technical

**DB migration**: `ALTER TABLE categories ADD COLUMN IF NOT EXISTS icon text;` — nullable column for persisting user-selected icon key.

**`actions/categories.ts`** — added `createCategory({ name, color, icon })` server action; inserts with `type: "both"`, revalidates `/transactions`, `/dashboard`, `/settings`.

**`components/ui/dialog.tsx`** — added `overlayClassName?: string` prop to `DialogContent`; passed through to `<DialogOverlay className={overlayClassName} />`.

**`components/transactions/category-picker.tsx`** — full rewrite:
- `ICON_REGISTRY` — 44-entry map of icon key → LucideIcon (used for both the grid and persisted icon display)
- `getCategoryIcon(cat)` — checks `cat.icon` first (DB-persisted key), then falls back to keyword matching on the name
- `view: "list" | "create"` state; `localCategories` state for immediately-visible newly-created categories
- `handleCreate(selectAndClose: boolean)` — `false` = create + return to list; `true` = create + select + close picker
- `useTransition` for the async create action (shows "Saving…" on the Save button)
- `overlayClassName` on nested `DialogContent` for frosted-glass effect

**Category queries updated** to include `icon`:
- `app/(dashboard)/transactions/page.tsx` — `select("id, name, type, color, icon")`
- `app/(dashboard)/dashboard/page.tsx` — `select("id, name, type, color, monthly_limit, icon")`

---

## Phase 30 — Remove Net Worth Full Page

### Changes
- `app/(dashboard)/goals/page.tsx` — removed `"Full view →"` link from the Net Worth card header; removed `import Link from "next/link"` (no longer needed); removed `allAccounts.slice(0, 6)` limit so all accounts display in the card; removed the `+N more accounts — view all` overflow row (it also linked to `/net-worth`)
- `app/(dashboard)/net-worth/page.tsx` + `loading.tsx` — **deleted** entirely (the route `/net-worth` no longer exists)
- Net Worth remains fully functional as an embedded card on the Goals page with `+ Add account`, edit, and delete buttons — just no separate full-page view

---

## Phase 29 — Budget by Category

### Feature
Users can now assign per-category spending limits directly from the "Set Budget" dialog — no need to visit Settings.

### UX Design
- New **Step 4** (numbered dynamically: step 3 when no income entered, step 4 when income is shown) titled "Budget by category" with an "(optional)" label
- Placed after the Savings preview / 50-30-20 tip, behind a horizontal rule separator
- Each row: `[Category dropdown] [₹ amount input] [× remove]`
- `+ Add category budget` button (brand-green, circled plus icon) adds a new empty row
- Button is hidden once all expense/both-type categories have been assigned
- On open: existing category limits are pre-populated as rows so users see what's already set
- Duplicate prevention: already-selected categories are excluded from other rows' dropdowns
- On save: valid rows update `monthly_limit` on categories; rows that were present when the dialog opened but removed by the user have their limit cleared (set to `null`)

### Technical
- `actions/budget.ts` — added `saveCategoryLimits({ categoryId, limit }[])` server action; loops through updates and calls `supabase.from("categories").update({ monthly_limit })`, revalidates `/dashboard` + `/settings`
- `components/dashboard/budget-setup-dialog.tsx` — full rewrite:
  - New `categories?: Category[]` prop (optional, backward-compatible)
  - `CatBudgetRow { rowId, categoryId, amount }` state array
  - `getCategoryOptions(rowId)` filters out already-used categories per row
  - `handleSave` chains `updateBudget` → `saveCategoryLimits` in sequence
  - Imports: `Plus`, `X` from lucide-react; `CustomSelect` from `@/components/ui/custom-select`
- `app/(dashboard)/dashboard/page.tsx`:
  - `allCats` query updated to also select `monthly_limit`
  - Both `<BudgetSetupDialog>` usages now receive `categories={allCats ?? []}`

---

## Phase 28 — Dashboard Quick-Actions

### Problem
"Add Transaction" and "Add Recurring Transaction" were only accessible from the Transactions page and Settings page respectively. The dashboard had no way to quickly log something.

### Changes

**`components/transactions/transaction-dialog.tsx`**
- Added `triggerVariant?: "primary" | "secondary"` prop (default `"primary"`)
- `secondary` renders a white outlined button (`bg-white border-gray-200`) — used on the dashboard to establish visual hierarchy where "Add Recurring" is the primary CTA
- `primary` retains the existing green filled button — used on the Transactions page and elsewhere

**`app/(dashboard)/dashboard/page.tsx`**
- Added `RecurringDialog` + `TransactionDialog` imports
- Added 5th parallel query: `allCats` — fetches `id, name, type, color` for all user + system categories (needed by both dialog props)
- Header changed from a simple title div to a flex row: title/date left, two action buttons right
  - `<TransactionDialog categories={allCats} triggerVariant="secondary" />` → white outlined "Add Transaction"
  - `<RecurringDialog categories={allCats} />` → green filled "Add Recurring" (primary CTA)

### Visual hierarchy rationale
Green = primary action (set up a recurring transaction — high value, less frequent). White = secondary action (log a one-time transaction — routine, lower weight). This matches the user's request and standard button hierarchy patterns.

---

## Phase 27 — Calendar UX Overhaul

### Changes

**Placement**
- `TransactionFilters` now accepts a `calendarSlot?: React.ReactNode` prop
- Calendar button is rendered inline in the filter bar — after the "All categories" dropdown, before the "Clear" button
- Trigger redesigned from an icon-only square to a rectangular `h-9` button matching the other filter controls: CalendarDays icon + "Calendar" label

**Day detail view**
- Clicking any day that has transactions opens a day detail panel inside the same dialog (same size, same modal — no new window)
- Panel shows: back arrow → date title, large income/expense summary cards, scrollable transaction list (dot icon, description, category, ±amount)
- New server action `getDayTransactions(date)` in `actions/calendar.ts` fetches `description, type, amount, categories(name, color)` for the selected date
- Empty days (no transactions) are `cursor-default` and non-interactive

**Performance: client-side month cache**
- `cacheRef` (`useRef<Map<string, Record<string, DayData>>>`) stores fetched month data keyed by `"year-month"`
- Cache-hit navigation (revisiting a month) is instant — no network round-trip, no loading state
- Adjacent months are silently prefetched whenever the calendar opens or the user navigates, so the next prev/next click is usually instant too
- Loading spinner appears only on the month label (not a full grid blank) during cache-miss fetches

**Today styling**
- Removed `bg-[#1E6B4E] text-white` solid green fill
- Replaced with `ring-2 ring-[#1E6B4E]` border outline only; date number uses `text-[#1E6B4E] font-bold`
- Legend updated: today dot is now `border-2 border-[#1E6B4E]` (hollow) instead of filled green

**Files changed**
- `actions/calendar.ts` — added `DayTransaction` interface + `getDayTransactions` server action
- `components/transactions/transaction-calendar.tsx` — full rewrite
- `components/transactions/transaction-filters.tsx` — added `calendarSlot` prop
- `app/(dashboard)/transactions/page.tsx` — pass `<TransactionCalendar />` as `calendarSlot`, simplified wrapper

---

## Phase 26 — Chart Interaction Polish

### Problem
- **Pie chart**: Clicking a segment rendered a grey outlined box (Recharts default `activeShape` adds a stroke and lighter fill).
- **Bar chart**: Hovering a column rendered a grey background rectangle behind the bars (Recharts `<Tooltip>` default `cursor` prop).

### Changes

**`components/dashboard/category-pie-chart.tsx`**
- Added custom `ActiveSlice` component using Recharts `Sector` — on click, the segment expands `outerRadius + 6px` with `stroke="none"` (clean pop effect, no grey border)
- Added `stroke="none"` to both `<Pie>` and each `<Cell>` to eliminate any segment outlines at rest
- `activeShape={ActiveSlice}` passed to `<Pie>` — replaces Recharts' default grey-outline active state

**`components/dashboard/monthly-bar-chart.tsx`**
- Added `cursor={false}` to `<Tooltip>` — removes the grey background rectangle entirely; the tooltip card still appears on hover

---

## Phase 23 — Google OAuth, Auth Page Redesign, Split Insights Charts

### 1. Google Sign-In (OAuth via Supabase)
- Both `/login` and `/signup` now have a **"Continue with Google"** button
- Flow: click → `supabase.auth.signInWithOAuth({ provider: 'google' })` → Google OAuth → `/auth/callback?code=...` → session exchange → `/dashboard`
- **New route:** `app/auth/callback/route.ts` — exchanges OAuth code for a Supabase session
- **⚠️ One-time setup required by developer:**
  1. Google Cloud Console → APIs & Services → Credentials → Create OAuth 2.0 Client ID
  2. Add `https://<your-supabase-project>.supabase.co/auth/v1/callback` to Authorized redirect URIs
  3. Supabase Dashboard → Authentication → Providers → Google → enable, paste Client ID + Secret
  4. Add `https://finance-tracker-drab-mu.vercel.app/auth/callback` to Supabase redirect allow-list

### 2. Auth Page Redesign (Login + Signup)
- **Two-column layout** (desktop: form left, dashboard preview right; mobile: single column)
- Right panel: brand-green sidebar (`#1E6B4E`) with a decorative dashboard mockup:
  - FinTrack logo + tagline
  - Mock stat cards: Income / Expenses / Net
  - SVG area chart showing income vs expense curves
  - Category progress bars
- Google button appears above email/password form with an "or" divider
- Security trust badge moved below the card

**Files:**
- `app/(auth)/login/page.tsx` — full redesign
- `app/(auth)/signup/page.tsx` — full redesign
- `components/auth/dashboard-preview.tsx` — new decorative right-panel component
- `app/auth/callback/route.ts` — new OAuth callback route handler

### 3. Insights — Split Income & Expenses Charts
- Replaced the single combined "Income vs Expenses" chart with **two separate side-by-side panels**:
  - Left: **Income — {year}** (green area chart) — shows annual income figure in header
  - Right: **Expenses — {year}** (red area chart) — shows annual expense figure in header
- Cleaner visual hierarchy: each chart has its own colored dot indicator and total label
- `AreaTrendChart` updated: accepts `type: "income" | "expense"` prop (removed `Legend`, single `Area` series)

**Files:**
- `components/reports/area-trend-chart.tsx` — updated with `type` prop
- `app/(dashboard)/reports/page.tsx` — split into two chart panels

---

## Phase 20 — Transaction Dialog UX Improvements

Three UX improvements to the Add/Edit Transaction dialog:

### 1. Inline Calculator
- Calculator icon button embedded at the right edge of the Amount input
- Clicking the icon toggles an inline `CalcPanel` below the amount field
- Supports full arithmetic: `+`, `-`, `×`, `÷`, parentheses, decimals
- Safe evaluator: character whitelist `^[\d+\-*/×÷.()\s]+$` → `Function('"use strict"; return (...)')()` — no `eval`
- Live preview shows `= result` as you type; `=` button fills the amount field and closes the panel
- `C` clears expression; `←` deletes last character

**Files:** `components/transactions/transaction-dialog.tsx` (CalcPanel component + safeCalc function)

### 2. Field Order Resequenced
Old order: Type → Amount → Description → Category → Date  
New order: **Type → Amount+Calculator → Category → Description → Payment Method → Date**

Rationale: Category is a required high-priority field; Description is optional and placed after. Payment Method sits between Description and Date as a secondary optional field.

### 3. Payment Method Selector
- 5 chip-style toggle buttons with icons, tailored for Indian payment context:
  - **Cash** (Banknote icon)
  - **UPI** (Smartphone icon)
  - **Card** (CreditCard icon)
  - **Net Banking** (Building2 icon)
  - **Wallet** (Wallet icon)
- Click to select, click again to deselect (optional field)
- Selected chip shows brand-green border + tint; unselected shows gray border
- Persisted to DB via new `payment_method` column on `transactions` table

**DB migration:** `ALTER TABLE transactions ADD COLUMN payment_method text DEFAULT NULL`  
**Validation:** `lib/validations/transaction.ts` — `z.enum(["cash","upi","card","net_banking","wallet"]).optional()`  
**Actions:** `actions/transactions.ts` — both `addTransaction` and `updateTransaction` read and write `payment_method`

---

## Phase 21 — Custom Dropdowns + Category Picker with Icons

### 1. Custom Dropdown (`components/ui/custom-select.tsx`)
Replaced all native `<select>` elements with a fully-styled custom dropdown:
- Rounded trigger button with chevron (rotates on open)
- Dropdown opens below with `rounded-xl`, `shadow-lg`, brand green focus ring
- Selected item shown with checkmark + `#1E6B4E` tint
- Click-outside closes; reusable `CustomSelect` component accepts `options`, `value`, `onChange`
- Used in: `transaction-filters.tsx` (period filter, category filter)

### 2. Category Picker (`components/transactions/category-picker.tsx`)
Replaced `<select>` for category in the transaction dialog and recurring dialog with a custom modal picker:
- **Trigger button**: styled like a form field; shows selected category's icon + name
- **Modal**: "Choose category" dialog with search bar (auto-focused, clearable), scrollable category list, Close footer
- **Each row**: icon badge (rounded square, tinted on selection) + category name + checkmark if selected
- **Icon mapping**: keyword rules map category names to lucide icons (monochrome, no emojis):
  - Food/Dining → UtensilsCrossed, Education → GraduationCap, Entertainment → Monitor
  - Health → Activity, Rent/Housing → Home, Shopping → ShoppingBag, Transport → Car
  - Travel → Plane, Bills/Recharge → Zap, EMI/Loans → CreditCard, Salary → TrendingUp
  - Investment → BarChart2, Grocery → ShoppingCart, Gym → Dumbbell, Other/Misc → Tag
  - Fallback: `Tag` for unrecognized names

**Files:**
- `components/transactions/category-picker.tsx` — new component
- `components/ui/custom-select.tsx` — new reusable styled dropdown
- `components/transactions/transaction-dialog.tsx` — category select → CategoryPicker (via Controller)
- `components/transactions/transaction-filters.tsx` — period + category selects → CustomSelect
- `components/settings/recurring-dialog.tsx` — category select → CategoryPicker (via Controller)

---

## Phase 22 — Nav 5-Tab, Calendar View, Export Dialog, Always-visible Actions

### 1. Navigation reduced to 5 tabs
- Removed Settings from main nav (both sidebar + bottom nav)
- Settings now lives in the sidebar footer (below the user row) — always accessible on desktop
- Mobile: tapping the avatar/initials in the top header now navigates to `/settings`
- Bottom nav retains 5 tabs: Home, Transactions, Goals, Net Worth, Insights

**Files:** `nav-links.tsx`, `bottom-nav.tsx`, `sidebar.tsx`, `mobile-header.tsx`

### 2. Spending Calendar
- Calendar icon button placed to the right of the filter row on the Transactions page
- Clicking opens a floating Dialog: "Spending Calendar"
- **Month navigation**: prev/next arrows; clicking the month label resets to current month; can go back to any past month
- **Summary strip**: Income / Expenses / Net for the displayed month
- **Calendar grid**: 7-column (Sun–Sat), each day cell shows the date + a compact amount (e.g. `-5K`, `+50K`)
  - Red cell = expense-only day; Green = income-only; Blue = both; Brand-green circle = today
- **Data**: `actions/calendar.ts` → `getCalendarData(year, month)` fetches transactions for that month from Supabase, grouped by date client-side
- Legend row at the bottom explains color coding

**Files:** `actions/calendar.ts` (new), `components/transactions/transaction-calendar.tsx` (new), `app/(dashboard)/transactions/page.tsx`

### 3. Export CSV Dialog
- Clicking "Export CSV" now opens a dialog instead of immediately downloading
- Dialog fields: **From** (month + year selectors) / **To** (month + year selectors) / **Transaction type** (All / Income only / Expenses only)
- File name preview shows the exact filename before exporting
- `actions/export.ts` updated: supports `fromDate` / `toDate` params (custom date range takes priority over `period`)

**Files:** `components/transactions/export-dialog.tsx` (new), `actions/export.ts` (updated)

### 4. Always-visible Edit/Delete buttons
- Removed the `md:opacity-0 md:group-hover:opacity-100` hover-only pattern from transaction rows
- Edit (pencil) and Delete (trash) buttons are now permanently visible on all screen sizes

**Files:** `app/(dashboard)/transactions/page.tsx`

---

## Phase 41 — Dashboard Dynamic Greeting

### Feature 1 — Time-based Dynamic Greeting

**Problem:** The dashboard header displayed a static "Dashboard" heading with the current month. To improve UX and make the dashboard feel more personal and empathetic, a dynamic time-based greeting with motivational microcopy is required.

**Solution:** Implemented a new `<DynamicGreeting />` client component that checks the user's local browser time and displays contextual greetings.

**`components/dashboard/dynamic-greeting.tsx`:**
- A `"use client"` component that receives `firstName`.
- Uses `useEffect` to safely get the local hour without hydration mismatch.
- Renders a placeholder with `opacity-0` during SSR to maintain exact layout dimensions and prevent layout shifts (CLS).
- Displays greetings based on 4 time blocks:
  - 00:00-04:59: "Up late, [Name]? Let's balance the books."
  - 05:00-11:59: "Good morning, [Name]. Ready to conquer the day?"
  - 12:00-16:59: "Good afternoon, [Name]. Keep up the momentum."
  - 17:00-23:59: "Good evening, [Name]. Time to review and relax."

**`app/(dashboard)/dashboard/page.tsx`:**
- Parses `firstName` from `user_metadata.full_name`.
- Replaced the static header `div` with the `<DynamicGreeting firstName={firstName} />`.
- Wrapped in `flex-1 min-w-0` so the text correctly truncates with an ellipsis (`...`) on very small mobile screens instead of breaking the flex layout or pushing the action buttons off-screen.

---

## Phase 42 — Transaction List UX Refinements

### Feature 1 — Improved Touch Targets & Hover Reveal

**Problem:** Transaction list rows had action icons (Edit/Delete) that were always visible, creating visual clutter. Additionally, the touch targets for these icons were too small, and the inline delete confirmation caused layout shifting when clicked.

**Solution:** Refined the action buttons to be larger, hidden by default, and removed the inline confirm step.

**`components/transactions/animated-transaction-list.tsx`:**
- **Hover Reveal:** The action buttons container now uses `opacity-0 group-hover:opacity-100` to keep the list clean until the user hovers over a row.
- **Touch Targets:** The Delete button now uses `p-2` with a `size-4` icon to ensure a clickable area of at least 32x32px, featuring a smooth `hover:bg-red-50 hover:text-red-500` background transition.
- **Removed Inline Confirm:** Deleted the `isConfirming` state logic. Clicking the trash icon now instantly fires the delete action, relying completely on the existing Undo Toast for safety, preventing the layout shift caused by rendering "Delete / Cancel" text buttons.

**`components/transactions/transaction-dialog.tsx`:**
- **Touch Targets:** Updated the Edit trigger button from fixed `h-7 w-7` dimensions to `p-2` padding with a `size-4` Pencil icon to match the Delete button's size and touch target standards, using a `hover:bg-gray-100 hover:text-gray-600` transition.

---

## Phase 43 — Transaction List Desktop Layout Upgrade

### Feature 1 — Two-Column Grid & Inline Calendar

**Problem:** The Transaction List occupied the entire width of the page on large screens, resulting in wasted whitespace within the transaction rows and hiding the Spending Calendar behind a modal trigger.

**Solution:** Completely refactored the desktop layout to a 2-column grid, permanently exposing the calendar inline and tightening the row elements for better information density.

**`app/(dashboard)/transactions/page.tsx`:**
- Implemented a CSS grid layout (`lg:grid-cols-[1fr_340px]`) to separate the main transaction workflow from the calendar sidebar.
- Left Column: Houses the Summary Stats, Empty states, Filters, and the Transaction List.
- Right Column: A sticky container (`lg:sticky lg:top-8`) that renders `<TransactionCalendar inline />`, gracefully degrading to stack vertically on mobile.

**`components/transactions/transaction-calendar.tsx`:**
- Added an `inline?: boolean` prop.
- When `inline` is true, the calendar bypasses the trigger button and `Dialog` modal, rendering directly into a styled container.
- **UI Cleanup:** Automatically hides the "Income / Expenses / Net" monthly summary strip when rendered inline to prevent redundant UI clutter (since this data is already present in the main page header).
- **Inline Day Detail:** When a user clicks a specific day, the Day detail view replaces the calendar grid inline (with a back arrow) instead of launching a modal.

**`components/transactions/transaction-filters.tsx` & `transaction-manager.tsx`:**
- Removed the `calendarSlot` injection. The "Calendar" trigger button no longer appears inside the filter bar.
- Tightened padding within the `TransactionManager` rows (from `px-5 py-4` to `px-4 py-3` with tighter gaps) to ensure elements sit closer together comfortably within the narrower left column constraint.

---

## Phase 44 — Transaction List Optimization

### Feature 1 — Chronological Date-Grouping & Infinite Batch Loading

**Problem:** A flat list of transactions dumping hundreds of records into the DOM at once hurts frontend performance, visual hierarchy, and makes chronological parsing tedious for the user.

**Solution:** Introduced an infinite scrolling batch loader paired with chronological date-grouped sub-headers.

**`app/actions/transactions.ts`:**
- Created a server action `fetchTransactionsBatch` to accept filters, `offset`, and `limit` to query and return specific chunks of transaction data directly from Supabase.

**`app/(dashboard)/transactions/page.tsx`:**
- The server component still evaluates all matches to accurately calculate the top-level Income, Expense, and Net aggregate statistics.
- Slices the results to pass only the first 20 records into the client component as `initialTransactions`.

**`components/transactions/transaction-manager.tsx`:**
- Implemented `IntersectionObserver` directly within the component to detect when a user scrolls near the bottom of the list, triggering the fetch for the next 20 items.
- Grouped the linear list of transactions into chronological buckets.
- Formats dates intelligently: using `Today`, `Yesterday`, or specific dates like `May 15, 2026`.
- Wrapped groups in sticky sub-headers styled with muted tracking uppercase text (`text-xs font-semibold text-gray-500 uppercase`) and generous padding.
- Displays an animated pulsing skeleton row at the bottom of the list when background fetches are active to eliminate UI ambiguity.

---

## Phase 45 — MoM Summary Deltas

### Feature 1 — Contextual Comparative Stats

**Problem:** The Summary Cards (Income, Expenses, Net) displayed isolated totals without comparative context, meaning users couldn't tell at a glance if their financial health was improving or declining relative to the last period.

**Solution:** Introduced dynamic Month-Over-Month (MoM) percentage deltas with semantic color-coding to provide immediate contextual feedback.

**`app/(dashboard)/transactions/page.tsx`:**
- **Data Calculation:** Implemented a new `getPreviousDateRange` helper that dynamically maps the currently active time period (e.g., `this_month`, `last_month`) to its immediately preceding period of the same duration.
- **Parallel Query Execution:** Optimized server performance by fetching both the current transactions and the previous period's aggregates concurrently using `Promise.all`.
- **Delta Math:** Calculated percentage change: `((Current - Previous) / Previous) * 100`.
- **`<DeltaBadge />` Component:** Built an internal component to handle the semantic rendering:
  - **Income / Net:** An increase (↑) is visually styled as "Good" (`text-green-600`), and a decrease (↓) is "Bad" (`text-red-500`).
  - **Expenses:** The logic is inverted. An increase (↑) is "Bad" (`text-red-500`), while a decrease (↓) is "Good" (`text-green-600`).
- **UI Injection:** Added the badge directly beneath the main currency numbers, utilizing a subtle layout structure and keeping the "vs last month" text a neutral `text-gray-400` to maintain visual hierarchy.

---

## Phase 46 — Active Goal Progress Widget

### Feature 1 — Interactive Context-Aware Sidebar Widget

**Problem:** The dashboard lacked visual reinforcement for user savings goals, causing the transaction list to feel purely clinical rather than encouraging positive financial habits.

**Solution:** Designed and injected an `ActiveGoalsWidget` into the right-hand desktop column (and stacked sequentially on mobile) beneath the calendar.

**`components/transactions/active-goals-widget.tsx`:**
- **Visual Design:** Created a minimalist, rounded widget matching the app's structural aesthetics (white background, thin border, proper padding). 
- **Mock Waterfall Distribution:** Configured mock fallback goals ("Emergency Fund", "New Laptop", "Vacation") and established a context-aware data binding. The widget accepts the active `transactions` array, calculates total "Net Saved" (Income - Expense), and distributes this sum sequentially across the goals to compute realistic progress.
- **UI / Microcopy:** Added prominent vector icons (Lucide), a bold percentage tag, and muted supporting text (e.g. `₹12,000 of ₹50,000 saved`) so users can parse progress immediately.
- **Animations:** Implemented a smooth CSS transition driven by a `mounted` state on `useEffect` so that the custom progress bars smoothly animate from 0% to their target width upon initial page load, boosting the "premium" interaction feel.

**`app/(dashboard)/transactions/page.tsx`:**
- Rendered the component directly inside the right-column flex container, ensuring it remains sticky relative to the user's viewport on large screens.

---

## Phase 47 — Upcoming Bills & Recurring Alerts Widget

### Feature 1 — Anticipatory Expense UI

**Problem:** Users couldn't anticipate upcoming fixed expenses on the dashboard, making accidental overspending common prior to bill due dates.

**Solution:** Designed an `UpcomingBillsWidget` rendering a sorted, urgency-based list of recurring expenses that stacks beneath the Active Goals widget.

**`components/transactions/upcoming-bills-widget.tsx`:**
- **Visual Hierarchy:** Built a clean list iterating over anticipated bills, applying a relevant category icon to each item (e.g., `Zap` for electricity, `Monitor` for software).
- **Time-Relative Badges:** Engineered dynamic visual urgency mapping based on `daysUntilDue`:
  - `> 5 days`: Neutral, muted gray badge.
  - `<= 3 days`: Subtle warning state utilizing orange text and background tints to draw eye focus.
- **"Mark as Paid" Interaction:** Added a hover-reveal `CheckCircle2` action button alongside each bill amount. Clicking this action is hooked into the existing `TransactionDialog`, securely passing a `prefill` data object (containing the bill's amount, category, and description) to instantly launch the modal ready for one-tap submission.

---

## Phase 48 — Performance Overhaul (Optimistic UI + Client-Side Filtering)

### Feature 1 — Optimistic Add Transaction

**Problem:** After submitting the Add Transaction modal, users waited 2–3 seconds watching a spinner while the server action completed — a jarring UX dead zone.

**Solution:** Fully optimistic add flow: the modal closes instantly, the new row appears in the list immediately, and the server write happens in the background. If it fails, the row is silently rolled back with an error toast.

**`components/transactions/transaction-dialog.tsx`:**
- Added two optional props: `onOptimisticAdd(data)` and `onOptimisticRemove(tempId)`.
- In add mode `onSubmit`: generates a unique `opt-{timestamp}-{random}` temp ID, calls `onOptimisticAdd` with the full row data, closes the dialog immediately, shows a success toast, then fires `addTransaction` async. On error, calls `onOptimisticRemove` to remove the row and shows an error toast.
- Edit mode remains fully synchronous (unchanged behaviour).

**`components/transactions/transaction-manager.tsx`:**
- `addOptimistic` — looks up the category from props to populate category name/color/icon fields, prepends the row to local state, and resets `typeTab` to "all" so the new row is always visible.
- `removeOptimistic` — filters the temp row out of local state on server error.
- Optimistic rows render at `opacity-70` with a "saving…" label. Their checkbox is disabled and edit/delete actions are hidden.
- Passes `onOptimisticAdd` and `onOptimisticRemove` through to `<TransactionDialog>`.

**`app/(dashboard)/transactions/page.tsx`:**
- Removed the standalone `<TransactionDialog>` from the page header — `TransactionManager` now owns the Add button with full optimistic support.

---

### Feature 2 — Instant Type-Tab Switching (0 ms, Client-Side)

**Problem:** Clicking the Income or Expense filter tab triggered a full server round-trip (URL param change → page re-render → DB query) causing a visible 2–3 second delay.

**Solution:** Type tabs are now pure client-side state managed inside `TransactionManager`. Filtering happens via `useMemo` on the already-loaded transactions array — no network request, no URL change, zero perceptible delay.

**`components/transactions/transaction-filters.tsx`:**
- Removed the All / Income / Expense toggle button group entirely.
- Removed `currentType` URL param read and `hasActiveFilters` dependency on it.
- Filters now only manage: search (debounced 350 ms), period, category, and the export kebab menu.

**`components/transactions/transaction-manager.tsx`:**
- Added `typeTab` state (`"all" | "income" | "expense"`) defaulting to `"all"`.
- `TYPE_TABS` constant drives a horizontal pill row rendered above the filter row.
- `displayedTransactions` — `useMemo` that applies the typeTab filter to the full local `transactions` array. O(n) in-memory, result appears in the same render frame.
- `incomeCount` / `expenseCount` — separate memos computed from the full (un-typeTab-filtered) array so badges always show accurate totals regardless of active tab.
- `handleTypeTab(tab)` — sets typeTab and clears bulk selection.
- Tabs are colour-coded: Income = green, Expense = red, All = brand green (`#1E6B4E`).
- Empty tab state: when the current tab yields zero rows but other types exist, a polite message is shown ("No income transactions in this period") without nuking the whole list UI.

**`app/(dashboard)/transactions/page.tsx`:**
- Removed server-side `typeFilter` from both the main Supabase query and the previous-period comparison query. The server now always returns all transaction types for the active period; the client handles type filtering.

---

## Phase 49 — Modal Interaction Bug Fix (Click-Outside, Bubbling, Layout Gap)

### Problem 1 — Backdrop Click Did Not Close the Add Transaction Modal

**Root cause:** `DialogContent` (Base UI `Dialog.Popup`) rendered a backdrop via `DialogOverlay` but no explicit `onClick` was wired to close the dialog when the overlay was clicked.

**Fix:**
- `components/ui/dialog.tsx`: Added `onClose?: () => void` prop to `DialogContent`. The prop is forwarded as `onClick` to `DialogOverlay`, which passes it as `onClick` to `DialogPrimitive.Backdrop`. Typing updated: `DialogOverlay` now accepts `onClick?: React.MouseEventHandler` in addition to its existing `DialogPrimitive.Backdrop.Props`.
- `components/transactions/transaction-dialog.tsx`: Passes `onClose={() => setOpen(false)}` to `<DialogContent>` so the backdrop click explicitly closes the modal.

---

### Problem 2 — Nested Dialog Caused Event Bubbling (Both Modals Closed Together)

**Root cause:** `CategoryPicker` implemented the category selector as a second `Dialog` (with its own full-screen `Dialog.Backdrop` at `z-50`) nested inside the Transaction modal. When either backdrop was clicked, the events could propagate between the two Base UI Dialog roots, causing both to close simultaneously. Pressing Escape also closed both.

**Fix:**
- `components/transactions/category-picker.tsx`: Removed the entire nested `Dialog` / `DialogContent` pattern. Replaced with a **portal-rendered overlay panel** using `createPortal(panel, document.body)`.
  - The outer backdrop div (`fixed inset-0 z-[60]`) has `onMouseDown={handleClose}` — clicking anywhere on it closes *only* the category picker.
  - The inner panel div has `onMouseDown={e => e.stopPropagation()}` — clicks inside the panel never reach the backdrop handler and never propagate to the parent Transaction dialog.
  - Escape key: added a `document.addEventListener('keydown', handler, true)` in **capture phase** so the picker's Escape handler fires before Base UI's Transaction dialog handler, calls `e.stopImmediatePropagation()`, and closes only the picker.
  - `mounted` state + `useEffect(() => setMounted(true), [])` guard ensures the portal only renders client-side (safe for Next.js SSR).

---

### Problem 3 — ~20px Visual Gap Around Category Panel

**Root cause:** The nested `Dialog` approach used Base UI's `Dialog.Popup` with `fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2` positioning relative to the viewport *and* the `p-4 gap-4` defaults from `DialogContent` (even when overridden with `p-0 gap-0`, the dialog's own frame and the white/blurred `overlayClassName` created a visual discontinuity layer around the panel, appearing as a gap).

**Fix:** The new portal panel uses a single wrapper div (`fixed inset-0 z-[60] flex items-center justify-center`) with the inner panel (`relative w-full max-w-sm rounded-xl bg-white border border-gray-200 shadow-2xl overflow-hidden`) positioned precisely via flexbox centering. No extra offsets, no intermediate wrapper padding — the panel sits flush with its own border-radius at the exact visual center. All inner section padding (`px-4 pt-4 pb-3`, etc.) is preserved from the original design.

---

## Phase 50 — Budget System Overhaul (Bug Fix + Reset + Breakdown Popover)

### Bug Fix: Category Budget Persistence

**Root cause (confirmed via RLS audit):** The `categories` table UPDATE policy is `auth.uid() = user_id`. System categories have `user_id = NULL`, so the condition evaluates to `false` — Supabase silently returns 0 rows updated, no error surfaced. Every per-category limit set by the user was silently discarded on save.

**Fix — `profiles.category_limits` JSONB:**
- Applied migration: `ALTER TABLE profiles ADD COLUMN category_limits jsonb NOT NULL DEFAULT '{}'`
- `actions/budget.ts` — `saveCategoryLimits` now reads the current JSONB from `profiles`, merges the incoming diff (set or delete per key), and upserts back. Users always own their profile row → zero RLS friction.
- `app/(dashboard)/dashboard/page.tsx` — Removed the `limitedCats` parallel query (`categories WHERE monthly_limit IS NOT NULL`). Replaced with reading `profile.category_limits` from the already-fetched profile row. Saves one DB round-trip.
- `components/dashboard/budget-setup-dialog.tsx` — Added `categoryLimits?: Record<string, number>` prop. `handleOpen` pre-populates rows from this prop (not from `category.monthly_limit`). `handleSave` diffs against `categoryLimits` keys to compute which IDs were removed.

---

### Feature: Reset Budget ("Clear budget" button)

**UX decision:** Placed the "Clear budget" button in the **bottom-left** of the modal footer (opposite the "Save budget" CTA) using `text-red-400 hover:text-red-600` — muted destructive styling that signals danger without visual aggression. Only shown when a budget already exists (edit mode), so the "Set up" flow stays clean.

**`actions/budget.ts`** — New `resetBudget()` server action: sets `monthly_budget = null`, `rollover_enabled = false`, `category_limits = {}` in a single atomic update on `profiles`.

**`budget-setup-dialog.tsx`** — `handleReset` calls `resetBudget()`, shows a success toast, and closes the dialog. Disabled while loading to prevent double-fire.

---

### Feature: Category Breakdown Popover (Phase 51 redesign)

**UX decision (Phase 51):** Applied progressive disclosure — category bars are hidden by default and revealed on intentional click only. The old standalone `<CategoryLimits>` section has been removed from the dashboard document flow to eliminate visual clutter.

**Trigger button upgrade:** The small "Breakdown" pill was replaced with a prominent secondary-style "Category Breakdown" button (white bg, green border, `LayoutList` icon, `ChevronDown/Up` open state indicator). It sits inline with the progress bar on the same row — the bar is `flex-1` so it yields space naturally, no hardcoded widths needed.

**Popover positioning:** The `relative` wrapper spans the full progress-bar row width so `right-0` aligns the popover to the card edge, not just the button edge. Drops below (`top-full mt-2`), `z-30`, `w-72 sm:w-80`.

**`components/dashboard/budget-widget.tsx`**:
- `BreakdownPopover` internals unchanged — click-outside via `mousedown` + Escape in capture phase
- `BudgetWidget` layout restructured: header row → progress bar + button row → footer row
- `LayoutList`, `ChevronDown`, `ChevronUp` icons from lucide-react
- Popover only rendered when `categoryLimitItems.length > 0`

**`app/(dashboard)/dashboard/page.tsx`**:
- Removed `import { CategoryLimits }` and the `<CategoryLimits items={categoryLimitItems} />` JSX block
- `categoryLimitItems` data still computed and passed to `BudgetWidget` for the popover

---

## Phase 52 — Category Type Silo + Deletion + Creation Date

### Feature 1: Fix Category Type Bleeding

**Root cause:** `createCategory` was inserting all user-created categories with `type: "both"`, so every new category appeared in both the Income and Expense tab dropdowns regardless of context.

**Fix — strict type inheritance:**
- `createCategory` now accepts `type: "income" | "expense"` (no more `"both"` for user-created categories)
- `CategoryPicker` receives a new `transactionType` prop from `TransactionDialog` (via `selectedType = watch("type")`)
- On the create sub-view, a small pill badge ("INCOME" green / "EXPENSE" red) confirms which type the new category will be tagged with
- `localCategories` (created inline during the session) are filtered by `transactionType` in the `allCategories` memo — they can't bleed into the opposite tab even before a page refresh

### Feature 2: Category Deletion with Safe Fallback

**`actions/categories.ts` — `safeDeleteCategory(id)`:**
1. Finds the "Other" system category (`name = 'Other', user_id IS NULL`)
2. Bulk-reassigns all the user's transactions from the deleted category to "Other"
3. Deletes the category row (only user-owned, non-system rows)

**UX — inline confirm (no nested modal):**
- Hover over any user-created category row → trash icon appears via `opacity-0 group-hover:opacity-100`
- Click trash → row flips to danger state ("Delete «name»?" + **Delete** button + Cancel)
- At most one row can be in confirm state at a time (`confirmingDeleteId` state)
- After deletion: removed from `deletedIds` Set (optimistic client-side removal), form value cleared if it was selected, success toast shown

### Feature 3: Creation Date Indicator

- `Category` interface extended with `user_id` and `created_at` fields
- Dashboard and transactions page queries updated: `"id, name, type, color, icon, user_id, created_at"`
- `formatCreatedAt(iso)` formats to `"Added May 19"` using `toLocaleDateString("en-IN", { month: "short", day: "numeric" })`
- Shown only on user-created rows (`user_id !== null`), `text-[11px] text-gray-400 font-normal`, hidden on mobile (`hidden sm:block`), positioned left of the trash icon

### Files Changed

| File | Change |
|---|---|
| `actions/categories.ts` | `createCategory` accepts `type`; new `safeDeleteCategory` with reassignment |
| `components/transactions/category-picker.tsx` | `transactionType` prop; type-filtered local categories; deletion UI; creation date |
| `components/transactions/transaction-dialog.tsx` | `Category` interface + `user_id`/`created_at`; passes `transactionType` to picker |
| `app/(dashboard)/dashboard/page.tsx` | Categories query adds `user_id, created_at` |
| `app/(dashboard)/transactions/page.tsx` | Categories query adds `user_id, created_at` |

---

## Phase 53 — Toast Repositioning (Bottom-Right)

**Problem:** `<Toaster position="top-right" />` anchored notifications directly over the "Add Transaction" primary CTA in the top-right header, blocking rapid multi-entry workflows.

**Fix (`app/layout.tsx`):**
- `position` changed from `"top-right"` → `"bottom-right"` — away from all primary action areas
- `offset={24}` — explicit 24 px clearance from both bottom and right viewport edges (Sonner's shorthand applies the value to both axes simultaneously)
- `toastOptions.style.zIndex: 9999` — belt-and-suspenders above any Tailwind reset that could clobber Sonner's own `--z-index` CSS variable; sits above the mobile bottom nav (`z-50`) and sidebar elements

---

## Phase 54 — Optimistic UI: Quick Add + Monthly Budget Save

**Problem:** Two high-frequency interactions still suffered "pessimistic" 2–3 s lag caused by awaiting the Supabase round-trip before giving visual feedback:
1. **Quick Add form** — "Log" button was spinner-blocked until the server confirmed the insert.
2. **Monthly Budget dialog** — modal stayed open with "Saving…" spinner until both `updateBudget` and `saveCategoryLimits` resolved.

**Pattern applied — fire-and-forget with rollback:**
```
snapshot values → instant feedback → background commit → rollback on failure
```

### Quick Add (`components/dashboard/quick-add-form.tsx`)

- Removed `useTransition` / `isPending` entirely.
- `handleSubmit` now:
  1. Snapshots `{ amount, categoryId, description }`.
  2. Instantly clears the form and re-focuses the amount input (30 ms timeout).
  3. Fires `toast.success("Expense logged ✓")` immediately — no waiting.
  4. Calls `quickAddExpense(...)` in the background via a plain `.then().catch()` chain.
  5. On `result.error` or `.catch()`: restores snapshot values + shows `toast.error(...)`.
- Submit button `disabled={!amount.trim()}` only — never frozen while the server runs.
- Button label always "Log" — no loading state copy.

### Monthly Budget Save (`components/dashboard/budget-setup-dialog.tsx` + `budget-widget.tsx`)

**`budget-setup-dialog.tsx`:**
- Added `onOptimisticSave?: (newBudget: number) => void` and `onOptimisticRollback?: () => void` to `Props`.
- `handleSave` converted from `async function` to a sync function with an IIFE for the background work:
  1. Validates `budgetNum > 0` (only guard remaining).
  2. Computes the category-limit diff synchronously before any state mutation.
  3. Calls `setOpen(false)` + `onOptimisticSave(budgetNum)` — modal closes and parent updates instantly.
  4. Fires `updateBudget` + `saveCategoryLimits` inside `(async () => { ... })().catch(...)`.
  5. `.catch` calls `onOptimisticRollback?.()` + `toast.error(...)` — rolls back the widget display.
  6. On success path: `toast.success("Budget saved!")` after both server calls complete.
- Save button: `disabled={!budgetNum}` only — removed `loading` dependency; label always "Save budget".
- `loading` state retained exclusively for the destructive `handleReset` (clear budget) flow.

**`budget-widget.tsx`:**
- Added `const [optimisticBudget, setOptimisticBudget] = useState<number | null>(null)`.
- `const displayBudget = optimisticBudget ?? budget` — all calculations (`pct`, `remaining`, `over`, "of X" text, "over budget" text) derive from `displayBudget` so they react instantly.
- Passes to `BudgetSetupDialog`:
  - `onOptimisticSave={(newBase) => setOptimisticBudget(newBase + rolloverAmount)}`
  - `onOptimisticRollback={() => setOptimisticBudget(null)}`
- `optimisticBudget` self-corrects to `null` once `revalidatePath` (triggered inside `updateBudget`) causes the Next.js server component to re-render and push fresh `budget` prop — no explicit cleanup needed.

---

## Phase 55 — Quick Add Dropdown UI Standardization

### Feature
Replaced the native HTML `<select>` element in the Dashboard "Quick add" form with the premium `CustomSelect` component to maintain visual consistency across the application.

### UX Design & Changes
- Integrates category vector icons alongside text, perfectly matching the style established in the Transactions filter bar.
- Replaces harsh default OS blue highlights with the app's custom soft gray hover states.
- Applies custom background styling (`bg-gray-50`) to the dropdown trigger so it seamlessly aligns with the adjacent "Amount" and "Note" input fields in the inline form.
- Standardizes component usage across the platform, improving the "premium" feel.

---

## Phase 56 — Transaction Filter Visual Flow Optimization

### Feature
Reordered the interactive elements in the Transactions filter bar, moving the "Clear" button to appear strictly after the kebab (more actions) menu.

### UX Design & Changes
- **Visual Hierarchy Fix**: Previously, the contextual "Clear" action sat between the main filters and the utility (CSV Export) menu, breaking the logical grouping of persistent controls.
- By placing "Clear" at the absolute right boundary of the container, it visually acts as a global reset bound to the entire filter group rather than an inline element.
- Reduces accidental clicks while accessing the Export menu and reinforces a cleaner, premium UI flow.

---

## Phase 57 — Monochrome Iconography System for Default Categories

### Feature
Standardized all default system category icons to a premium, minimalist monochrome aesthetic (`text-gray-500`) while preserving user-assigned colors for custom categories.

### UX Design & Changes
- **Premium SaaS Look**: Stripped hardcoded, multi-colored hex values from system category icons (e.g., Rent, Food, Bills) across the Quick Add dropdown, Transactions filter, and Category popover.
- **Dynamic Context**: Checks the `user_id` property. System defaults (`null`) render in monochrome. User-created categories (`!== null`) correctly apply and render their specific custom colors via inline styling.
- **Strict Readability Control**: Ensured that the category text and selection states never inherit the icon colors. Selected categories now render as high-contrast dark neutrals (`text-gray-900 font-semibold`) instead of the brand color, strictly enforcing WCAG readability and visual flow.

---

## Phase 58 — Category Picker Visual Decluttering

### Feature
- Unify Delete-on-Hover logic for custom categories across both Income & Expense views.
- Removed the "Added Date" (e.g., "Added 19 May") metadata from the category picker dropdown for custom user-created categories.

### UX Design & Changes
- **Visual Decluttering**: Analyzed the dropdown UI and determined that the category creation date was redundant information that cluttered the list row. 
- **Focus Optimization**: By removing this non-essential metadata, users can focus entirely on the category name and icon during the selection process. This maintains a clean, minimalist, and frictionless user flow when adding a transaction.
- **Unified Interaction**: Unified the hover-to-delete interaction logic so that custom categories always show the delete icon button regardless of the transaction type tab.

---

## Phase 59 — Neutralize Category Badges

### Feature
Stripped unnecessary multi-colored styling from system default category badges across all transaction lists to match the new minimalist monochrome aesthetic.

### UX Design & Changes
- **Neutral Styling**: Applied a light, muted background (`bg-gray-100`) and text (`text-gray-700`) to all default system category badges in the Recent Transactions widget and the main Transactions list.
- **Custom Category Preservation**: Updated the transaction mappings to include the category's `user_id`. Badges for custom user-created categories strictly retain their custom hex colors for easy recognition.
- **Chart Isolation**: Intentionally excluded the dashboard "Expense by category" donut chart and legend from this change, ensuring data visualizations remain fully colored for maximum readability.

---

## Phase 60 — Standardizing Date Pickers

### Feature
Replaced native, clunky browser date inputs with a custom, beautifully styled React popover DatePicker across all forms (Transaction, Recurring, and Goal creation).

### UX Design & Changes
- **Tailored Popover UI**: Embedded the Shadcn Popover & Calendar components, wrapping them in a standard headless React hook controller structure.
- **Brand Colors & Typography**: Replaced default browser blue selections with the dashboard's core forest green highlight (`bg-[#1E6B4E]`). Added premium hover states (`hover:bg-slate-100 text-slate-900`) and styled using clean, rounded corners (`rounded-md`).
- **Interactive Utilities**: Provided clear, minimalist text links for "Today" and "Clear" actions to avoid bulky buttons.

---

## Phase 61 — Resolving TypeScript Compilation & Deployment Errors

### Feature
Resolved multiple critical TypeScript errors in `transaction-manager.tsx`, `date-picker.tsx`, and `calendar.tsx` to enable successful Vercel production builds.

### UX Design & Changes
- **Type Safety Restoration**: Restored the accidentally omitted `category_name` property to the `TxnRow` interface to fix dynamic data mapping compilation failures.
- **Base UI Integration**: Refactored the popover trigger in `date-picker.tsx` to utilize Base UI's native `render` composition property, bypassing unsupported Radix-style `asChild` props.
- **Day Picker v10 API Compatibility**: Cleaned up the Shadcn Calendar integration by mapping custom table overrides to the new `month_grid` classNames key and removing deprecated `initialFocus` flags.

---

## Phase 62 — Monthly Budget Card Layout & Category Breakdown Modal

### Feature
Overhauled the `BudgetWidget` (`components/dashboard/budget-widget.tsx`) to declutter the Monthly Budget card and promote the Category Breakdown from a cramped popover into a centered modal dialog.

### UX Design & Changes
- **Left/Right Split**: Card is now a two-column flex layout. The left column holds the title, edit affordance, rollover badge, `% used`, the progress bar, and a single muted secondary row beneath the bar containing `spent of total · remaining · safe to spend today`. The right column is reserved exclusively for the action button, separated by a thin vertical border (`border-l border-gray-100`).
- **Isolated Vertical-Center Button**: Replaced the dropdown-style toggle with a standalone `Category Breakdown` button (`LayoutList` icon, no chevron) that is `items-center` aligned and sits alone on the far right of the card, eliminating the prior floating-text clutter that suffocated the trigger.
- **Centered Modal**: Replaced the in-card popover with a Base UI `Dialog` (`components/ui/dialog.tsx`) — backdrop dimmed at `bg-black/40` with `backdrop-blur-sm`, spacious `sm:max-w-lg` content, titled "Category Budget Breakdown" with a subtitle, generous `px-6 py-5` padding, larger 7×7 category icon tiles, and a built-in `X` close button. Dismissable via the close button or backdrop click.
- **Visual Hierarchy**: Primary data (title, bar, %) reads first; secondary numbers collapse into a single muted dot-separated line; the action sits as a clear, isolated affordance — restoring breathing room and a clean horizontal flow.

---

## Phase 63 — Transactions Filter Performance: No-Flash Background Syncing

### Feature
Eliminated the disruptive route-level skeleton flash that fired on every Month / Category / Search filter change on the Transactions page, replacing it with instant client-side narrowing + silent background server sync.

### UX Design & Changes
- **`useTransition` Wrapper (`components/transactions/transaction-filters.tsx`)**: All filter navigations (`router.replace` for period, category, search, and Clear) now run inside React's `startTransition`. Next.js App Router skips the route segment's `loading.tsx` Suspense fallback during transitions, so the current transaction rows stay rendered until the new server payload arrives — no more skeleton flash on every dropdown click.
- **Live URL → Client-Filter Bridge (`components/transactions/transaction-manager.tsx`)**: `TransactionManager` now reads `useSearchParams()` directly and applies the active `category`, `period` (with on-the-fly date-range computation for `this_month` / `last_month` / `3_months` / `all`), and `search` filters to the already-loaded `transactions` array via a memoised `clientFiltered` set. Narrowing within loaded data resolves in 0 ms; the server fetch then quietly replaces the set with the canonical payload.
- **Optimistic Row Protection**: Pending writes (rows with `opt-…` IDs) bypass the client-side filter, so an in-flight Add Transaction never blinks out mid-save when the URL filters change.
- **Non-Blocking Sync Indicator**: Added a subtle "Syncing…" pill with a small spinning ring next to the filters while `isPending`, plus a faint `opacity-90` cue on the filter row — the user gets feedback that data is refreshing without losing their place in the list.
- **Tab Counts Track Live Filters**: Income / Expense tab badges now derive from the client-filtered set, so the counts stay coherent with whatever category / period the user just selected — no stale numbers while the server is mid-flight.
- **Scroll Position Preserved**: `router.replace(..., { scroll: false })` keeps the user pinned to their current viewport on every filter change.

---

## Phase 64 — Above-the-Fold Dashboard Refinement

### Feature
Refined the top half of the main dashboard (`app/(dashboard)/dashboard/page.tsx`, `components/dashboard/budget-widget.tsx`, `components/dashboard/quick-add-form.tsx`) to reduce text clutter, neutralise competing colors, and lift the Weekly Trend charts into the first-screen viewport.

### UX Design & Changes
- **Neutral, Compact Trend Deltas**: The Income / Expenses / Net savings / Transactions summary cards no longer shout. The "vs last month" phrasing has been removed entirely; deltas now render as a single compact token like `↑ ₹10.2K` or `↓ ₹1.5L` via a new `compactINR()` helper (K / L / Cr scaling). All trend text and arrows are unified to `text-gray-400 font-medium` — green/red intent is reserved for the primary balance numbers above.
- **Glance-Value Budget Bar**: `BudgetWidget`'s secondary row beneath the progress bar now shows only `₹X remaining` (or `₹X over budget` when applicable). The redundant `spent of total` figure and the `Safe to spend today` pill have been removed from the dashboard's top-level view — those numbers are still available elsewhere when the user drills in, keeping the main bar scannable in under a second.
- **Tighter Vertical Rhythm (≈ 8–12 px per gap)**: `mb-6 → mb-4` on the summary cards grid, the Quick Add form, the budget widget (both the active widget and its dashed empty-state), and the charts row. `pt-6 → pt-4` on the main container. Net effect lifts the Weekly Trend / Category Pie chart row up into the first-screen viewport on standard 1080p displays without removing any features or compressing card internals.
- **Visual Hierarchy Preserved**: Primary balances (₹ amounts) keep their green/red color intent and bold weight, so the eye still lands on them first; trend deltas now read as quiet, contextual subtitles; the budget bar telegraphs its single most-asked question ("how much is left?") immediately.

---

## Phase 65 — Sticky Header Polish: Flush Seam, Condensed Height, Demoted Quick-Add

### Feature
Final pass on the dashboard's top chrome (`app/(dashboard)/dashboard/page.tsx`, `components/dashboard/dynamic-greeting.tsx`, `components/dashboard/quick-add-form.tsx`) to align the sidebar/header seam, shorten the sticky header, and re-balance button visual rank.

### UX Design & Changes
- **Flush Sidebar/Header Seam**: The sticky greeting bar now uses a fixed `h-16` to match the sidebar's logo section (`Sidebar` top container is also `h-16`), so the two horizontal `border-b border-gray-100` strokes meet on the same Y-axis instead of stepping across the seam. The translucent `bg-white/95 backdrop-blur-sm` was swapped for solid `bg-white` to eliminate the cream `#F9F8F5` bleed-through that was reading as a hairline gap at the boundary.
- **Condensed Header Height**: Removed the `py-3.5` padding in favour of the `h-16 flex items-center` constraint — net vertical saving of ~14 px above the first content row. Greeting type scaled down in `DynamicGreeting`: title `text-xl → text-lg` with `leading-tight`; subtitle `text-sm → text-xs` with `leading-tight`. The two-line greeting block now sits comfortably centered against the sidebar logo, and the action buttons (`RecurringDialog` + `TransactionDialog`) share the same horizontal midline.
- **Demoted Quick-Add `Log` Button**: Stripped the primary `bg-[#1E6B4E] text-white` styling and re-skinned the button as a secondary neutral control — `bg-gray-100 text-gray-700` with a `border-gray-200` outline and a `hover:bg-gray-200 hover:text-gray-900` interaction state. The primary brand green is now reserved for the top-right `+ Add Transaction` button, restoring a single dominant call-to-action above the fold and a clear visual hierarchy.

---

## Phase 66 — Category Pie Chart: Top-5 Progressive Disclosure

### Feature
Capped the `CategoryPieChart` (`components/dashboard/category-pie-chart.tsx`) legend at five rows and lifted the long tail into a centered modal so the dashboard's right column stays height-locked against the adjacent Weekly Trend bar chart, regardless of how many categories a user has.

### UX Design & Changes
- **Top-N Truncation (TOP_N = 5)**: The card's legend now renders the five highest-spend categories only, via a defensive `[...data].sort((a, b) => b.value - a.value).slice(0, 5)`. Card height is fixed by construction — a user with 3 categories and a user with 30 see the exact same card footprint, so the right column no longer pops taller than the trend chart on the left.
- **"View All" Trigger — Not a Dropdown**: When `sorted.length > 5`, a subtle full-width button (`bg-gray-50` / `text-gray-600` / `hover:bg-gray-100`) labelled `View all {N} categories` appears under the top-5 list. It does not toggle in-place expansion, does not animate the card open, and does not render a popover anchored to itself — the card's height stays locked.
- **Centered Master-View Modal**: Clicking the trigger opens a Base UI `Dialog` (reused from `components/ui/dialog.tsx`) at `sm:max-w-lg` with a dimmed `bg-black/40` + `backdrop-blur-sm` overlay. Header shows `Expenses by category` with a tabular `{count} categories · {total} total this month` subtitle. The body lists the **complete sorted ranking** (`#1` through `#N` — not just the "remaining" tail), inside an `overflow-y-auto max-h-[60vh]` scroller for very long lists. Closable via the built-in `X` button or by clicking the dimmed overlay.
- **Shared `LegendRow` Component**: Both the card legend and the modal list render through a single internal `LegendRow` component, so the icon chip, percentage badge, and INR amount typography stay perfectly consistent between the two surfaces.

---

## Phase 67 — Quick-Add Payment Method + Secondary Button Standardisation

### Feature
Expanded the dashboard's Quick-Add strip (`components/dashboard/quick-add-form.tsx`, `actions/quick-add.ts`) to capture a payment method alongside amount/category/note, and promoted the "Category Breakdown" pill to the canonical secondary-button style for both the Quick-Add `Log` action and the header-level `+ Add recurring` action (`components/settings/recurring-dialog.tsx`).

### UX Design & Changes
- **Quick-Add Payment Dropdown**: Inserted a dedicated payment-method `CustomSelect` between the Category dropdown and the Note input, with icon-paired options for UPI (default), Cash, Card, Net Banking, and Wallet. Styling mirrors the adjacent Category control exactly — `h-9`, `bg-gray-50`, identical `[&>button]:bg-gray-50` override and `sm:w-36` footprint — so the four-field row reads as a single typed cluster instead of a bolted-on extension. The selected method now flows through `quickAddExpense` into the `transactions.payment_method` column, bringing parity with the full Transaction dialog and unlocking accurate cash-flow / UPI-vs-card breakdowns from the fastest entry path.
- **Brand-Green Secondary Standard**: Adopted the "Category Breakdown" pill as the official secondary-button template — `border-[#1E6B4E]/25 bg-white text-[#1E6B4E] shadow-sm` with a `hover:border-[#1E6B4E]/50 hover:bg-[#1E6B4E]/5 transition-all` interaction state and a `focus-visible:ring-[#1E6B4E]/40` focus ring. Replaces the previous flat `bg-gray-100 text-gray-700` look for the Quick-Add `Log` button (`h-9 px-5` retained — only the colour, border, shadow, and hover traits were copied, not the dimensions) and the secondary-variant `+ Add recurring` header trigger (`px-3.5 py-2 text-sm` retained).
- **Hierarchy Preserved**: The primary brand-green `+ Add Transaction` button in the sticky header still owns the only filled-green surface above the fold, while the new bordered-green secondaries form a coherent supporting tier — same hue, same shadow weight, same hover physics — so the eye can group "all the green outlines" as one consistent class of action without competing with the primary CTA.

---

## Phase 68 — Transactions Page Overhaul: Full-Width Ledger, Selection Mode, View Toggle

### Feature
Major structural reset of the `/transactions` page (`app/(dashboard)/transactions/page.tsx`, `components/transactions/transaction-manager.tsx`) to resolve the "second dashboard" identity crisis. The right-rail widget cluster was removed, the list expanded to full bleed, the trend deltas were muted, bulk-action UI was hidden behind an opt-in toggle, and a List/Calendar segmented control was scaffolded for the upcoming full-page calendar view.

### UX Design & Changes
- **Neutralised Top Summary Cards**: The Income / Expenses / Net cards no longer fight the primary balance for attention. The previous `DeltaBadge` rendered a coloured arrow with a percentage *and* a "vs last month" tail; it now renders only the arrow + percentage in muted `text-gray-400 tabular-nums`. The amounts themselves remain green/red, but the delta layer drops to background information — matching the Home dashboard's restrained delta treatment.
- **Right Sidebar Removed**: Deleted the `lg:grid-cols-[1fr_340px]` two-column shell along with its three inhabitants — `TransactionCalendar inline`, `ActiveGoalsWidget`, and `UpcomingBillsWidget`. These were duplicating Home-dashboard surfaces at a fraction of the size and were too cramped to be functionally useful here. The page's outer container collapses to a single full-width column.
- **Opt-In Selection Mode**: Bulk-delete checkboxes are now hidden by default. A new `Select` button (`CheckSquare` icon) in the third toolbar row toggles `selectionMode`; activating it reveals the per-row checkbox column *and* the select-all checkbox in the list header. The button swaps to a `Cancel` / `X` affordance while active, and `clearSelection` (called after a bulk action) also exits selection mode so the chrome auto-dismisses. Visually the toggle uses the brand-green secondary template (`border-[#1E6B4E]/25 bg-white text-[#1E6B4E] shadow-sm`).
- **List / Calendar View Toggle**: Added a premium segmented control next to the Select button — a `border-gray-200 bg-white p-0.5 shadow-sm` pill containing two tabs, `List` (`List` icon) and `Calendar` (`CalendarDays` icon). The active tab paints `bg-[#1E6B4E]/10 text-[#1E6B4E]`. Selecting Calendar swaps the list for a placeholder card ("Calendar view coming soon") so the UI is wired for the upcoming full-page daily-totals calendar without prematurely shipping a half-baked grid.
- **Full-Width "All Transactions" Container**: The list card is now `w-full`, with a new sticky header showing the title **"All Transactions"** plus a muted `{N} items` count. The legacy "Select all" checkbox row collapses into this same header strip and only materialises when `selectionMode` is active — keeping the header clean during normal browsing.
- **Row Restructuring (Category icon chip → details → amount → spacer → actions)**: Rebuilt the list-item layout to fix the "eye stretch" problem on wide screens. Each row now leads with a 36×36 rounded `category_color`-tinted icon chip, followed by a left cluster (description, category-name · date · payment-method pill) capped at `max-w-[520px]`. The amount sits immediately to the right of that cluster (`min-w-[110px]`), then a flexible spacer pushes the Edit/Delete icon group to the far right edge of the row. Net effect: the rich semantic information (what / where / when / how paid) reads as one tight block, the headline amount lives in the eye's natural landing zone, and only the destructive action affordances pin to the edge.
- **Payment Method Surfaced In-Row**: The transactions query already returned `payment_method`; it's now propagated into the `TxnRow` shape and rendered as an uppercase tracking-wide chip (`Cash` / `UPI` / `Card` / `Net Banking` / `Wallet`) in the secondary metadata line, completing the audit trail introduced by the Quick-Add payment dropdown in Phase 67.

---

## Phase 69 — Settings Page: Premium SaaS Restructure

### Feature
Elevated the `/settings` page (`app/(dashboard)/settings/page.tsx`) to a tier-one SaaS standard — narrowed the reading column, standardised every primary button to a single brand-green template aligned bottom-right, removed two misplaced cards, and introduced two new ones: **Preferences** (`components/settings/preferences-form.tsx`) and **Data & Privacy** (`components/settings/data-export-button.tsx`).

### UX Design & Changes
- **Constrained Reading Column**: The page main now uses a full-bleed `p-6 md:p-8` outer shell with an inner `mx-auto w-full max-w-3xl` reading column (~768 px). The settings cards no longer stretch edge-to-edge on wide monitors — forms become scannable, label-to-input distance stays tight, and the page reads as a single centered configuration document rather than a sparse dashboard.
- **Removed "System categories" Card**: The read-only chip-cloud was pure clutter — users could neither edit nor delete the seeded system categories, so surfacing them in Settings created decision fatigue without affording any action. The card and its data slice were deleted outright; system categories still appear naturally in every category picker across the app.
- **Removed "Recurring transactions" Card**: Recurring management is an operational concern, not a configuration one — it now lives exclusively next to the day-to-day transactions surface (Quick-Add and the dashboard "Due" card). The `RecurringDialog` import, the `recurring_transactions` Supabase query, and the entire list section were removed from Settings, alongside the unused `DeleteRecurringButton` import.
- **Standardised Primary Buttons (Bottom-Right Alignment)**: Every save / change action — `Save changes` (Profile), `Save changes` (Preferences), `Change password`, `Save changes` (Budget) — now uses the exact same template: `rounded-lg bg-[#1E6B4E] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#185c43]`. Each button is wrapped in a `flex justify-end` footer so it pins to the bottom-right of its respective form. The Budget form's prior side-by-side input/button layout was rebuilt vertically so its CTA lands in the same horizontal lane as every other settings primary; the `Clear` secondary stays inline beside it.
- **New "Preferences" Card (below Profile)**: Holds two `CustomSelect` dropdowns styled identically to the Quick-Add controls (`[&>button]:bg-gray-50`, full-width inside a `sm:grid-cols-2 max-w-lg` two-column lockup). **Primary Currency** offers ₹ INR (default), $ USD, € EUR, £ GBP; **Date Format** offers DD/MM/YYYY (default), MM/DD/YYYY, YYYY-MM-DD. Persistence is intentionally deferred — the local state + optimistic toast prove the contract while the schema/migration work is queued for a follow-up.
- **New "Data & Privacy" Card (page footer)**: Sits at the very bottom of the settings stack to anchor the page with a trust-building affordance. Uses the brand-green secondary button template (`border-[#1E6B4E]/25 bg-white text-[#1E6B4E] shadow-sm` with the matching hover-tint and focus-ring) for an **Export Data as CSV** button paired with a `Download` icon. Click currently surfaces a "coming soon" toast — the UI surface is ready for the CSV generation pipeline to slot in behind it without further design churn.

---

## Phase 70 — Goals Page: Master Planning Hub with Recurring Bills

### Feature
Expanded `/goals` (`app/(dashboard)/goals/page.tsx`) from a single-purpose savings tracker into a three-section master hub for long-term planning: **Financial Goals**, the new **Recurring Bills & Subscriptions**, and **Net Worth** — all wrapped in a strict, unified card chrome. Added a `triggerLabel` prop to `RecurringDialog` (`components/settings/recurring-dialog.tsx`) so the same component can render as `+ Add Bill` on this page while remaining `+ Add recurring` elsewhere.

### UX Design & Changes
- **Unified Card Chrome**: Pulled the card classes into two named constants — `cardClass = "rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden"` and `headerClass = "flex items-center justify-between gap-3 px-5 py-4 border-b border-gray-50"` — and applied them to every section on the page. Every card now shares the same radius, border colour, surface, shadow weight, and header strip. The result reads as a single configured surface rather than three independently-styled widgets.
- **Standardised Section Headers**: Each section's header is a flex row — bold title + 1-line subtitle on the left, the primary action button (`+ New Goal` / `+ Add Bill` / `+ Add Account`) pinned to the top right via the parent `justify-between`. No section has its CTA buried below content or floating mid-card anymore. The page-level `Goals & Planning` title and subtitle sit *above* the first card, not inside it, so the visual hierarchy reads: page → cards → content.
- **New "Recurring Bills & Subscriptions" Section**: The middle card is a full management surface for repeating payments — reuses the existing `RecurringDialog` (Add + Edit) and `DeleteRecurringButton`, fetches `recurring_transactions` joined with `categories(name)`, and renders each bill as `description · category · frequency · next due date · amount` with the per-row edit/delete affordances revealed on hover. This is now the canonical management hub that feeds the read-only "Due"/"Upcoming bills" widgets on the home dashboard.
- **Premium Empty State (Bills)**: When no recurring bills exist, the card renders a centred calendar icon in a `bg-[#1E6B4E]/10` chip, a bold "No recurring bills added yet" headline, supporting copy explaining the payoff ("automate logging and see what's coming up on the dashboard"), and a primary `+ Add your first bill` CTA — using the same `RecurringDialog` trigger but with a friendlier `triggerLabel`. Goals's empty state was harmonised to the same layout so the two empty states read as siblings.
- **Vertical Hierarchy & Breathing Room**: The three sections now stack inside an `mx-auto w-full max-w-3xl space-y-8` column. `space-y-8` (32px) between sections gives generous breathing room without feeling sparse, and the centered max-width keeps line-length comfortable on wide monitors — matching the constrained-column treatment used on Settings.
- **`RecurringDialog.triggerLabel` Prop**: Added an optional `triggerLabel` string that defaults to `"Add recurring"` and renders inside the existing `<Plus className="size-4" />` trigger. Goals passes `"Add Bill"` (top-of-section header) and `"Add your first bill"` (empty-state CTA); all other call sites stay unchanged.

---

## Phase 71 � Transactions Page: 2-Row Control Area Compression

### Feature
Compressed the Transactions page control area from three scattered rows into a tight, space-efficient 2-row layout.

### UX Design & Changes
- **Row 1 � Tabs + Filters + Primary Action**: The "All / Income / Expense" type tabs, the Search bar, Month dropdown, Category dropdown, and the 3-dot export menu are now co-located on the same horizontal line. The "+ Add Transaction" button is pinned to the far right via `ml-auto`. A `flex-wrap gap-4` outer container ensures graceful wrapping on smaller laptop screens � the filters wrap before the Add button is ever displaced.
- **Row 2 � Bulk Actions & View Toggles**: The Select (bulk action) toggle sits on the far left; the List / Calendar view toggle sits on the far right, aligned via `justify-between`. The row is visually lighter now that the filters no longer compete for the same line.
- **Implementation**: Added a `wrapperClassName` prop to `TransactionFilters` (`components/transactions/transaction-filters.tsx`). When `wrapperClassName="contents"` is passed, the filter wrapper uses CSS `display: contents` so its children (Search, Period, Category, kebab menu) participate directly in the parent flex container, rendering inline with the tabs as true flex siblings. Restructured `transaction-manager.tsx` to the new 2-row DOM structure accordingly.

---

## Phase 72 � Transactions Page: Strict 4-Column Grid Row Layout

### Feature
Replaced the ad-hoc flex layout on individual transaction rows with a strict CSS Grid to lock alignment across all rows regardless of content length.

### UX Design & Changes
- **Grid proportions**: `gridTemplateColumns: "2fr 0.6fr 0.8fr 0.6fr"` � resolves to 50% / 15% / 20% / 15% across the full row width.
- **Col 1 � Context (50%)**: Category icon chip + description (bold primary text) on top; date and category pill on the subtitle line. The category pill now uses the category's brand color as a tinted background chip (same `color + 1a` alpha as the icon chip) for immediate visual association.
- **Col 2 � Method (15%, centered)**: Payment method pill (UPI / Card / Cash etc.) isolated in its own column. Renders an em-dash placeholder when no method is recorded, keeping the column width stable.
- **Col 3 � Amount (20%, right-aligned)**: Income shown in `text-green-600` with `+` prefix; expenses in `text-red-600` with `-` prefix. Right-aligned `tabular-nums` ensures amounts stack cleanly.
- **Col 4 � Actions (15%, right-aligned)**: Edit and Delete icon buttons pinned to the far right edge via `justify-end`. Hidden for optimistic rows.
- **Checkbox compatibility**: The selection-mode checkbox remains as a leading flex item outside the grid so it does not disturb column proportions when toggled.

---

## Phase 73 � Quick Add Form: Dropdown Labels & Description Placeholder

### Feature
Improved clarity and accessibility of the Quick Add transaction strip inputs.

### UX Design & Changes
- **Category label**: Added a small `10px / uppercase / tracked / gray-400` label reading "Category" directly above the category dropdown. Once a value is selected the label keeps the field identifiable at a glance.
- **Payment Method label**: Same premium label treatment applied above the payment method dropdown, reading "Payment Method". Solves the context-loss problem where the selected value (e.g. "UPI") gives no hint of what the field represents.
- **Description placeholder**: Changed the free-text input placeholder from "Note (optional)" to "Description (optional)" � language consistent with financial ledger conventions and the rest of the app.
- Each labelled dropdown is wrapped in a `flex flex-col gap-0.5` container so the label sits flush above its control without disturbing the row's horizontal flex layout on desktop or the stacked layout on mobile.

---

## Phase 74 � Dashboard Charts: Segmented Control & Month Dropdown Header Controls

### Feature
Standardised the header controls on the two main dashboard charts, replacing confusing arrow-based pagination with industry-standard toggle patterns.

### UX Design & Changes
- **Weekly trend card � Segmented Control**: Removed the `<` / `>` ChevronLeft/Right arrow buttons and the dot-indicator row. Replaced with a pill-shaped segmented control (`bg-gray-100` container, `h-7`, `rounded-full`) in the top-right of the card header. Active segment slides a white pill with `shadow-sm` over the inactive option. The card title remains left-aligned and updates dynamically ("Weekly trend" / "Monthly trend") to reflect the active segment.
- **Expenses by category card � Month Dropdown**: `CategoryPieChart` now owns its own card chrome (`rounded-2xl border border-gray-100 bg-white p-5`) and renders the full card header internally. The title "Expenses by category" is left-aligned. A minimal month dropdown button (`h-7 rounded-full border border-gray-200`, same height as the segmented control) sits top-right, displaying the selected month name (e.g. "May 2026") and a `ChevronDown` caret. Clicking opens a 6-month dropdown list; the active month is highlighted in brand green. Outside-click closes the menu.
- **Visual balance**: Both controls share `h-7` height, `rounded-full` shape, `text-xs font-semibold` typography, and `border-gray-200` borders � they read as a matched pair across the two adjacent cards.
- **Dashboard page simplification**: Removed the now-redundant wrapper `<div>` and `<h2>` for the category card from `app/(dashboard)/dashboard/page.tsx`. The component is fully self-contained.

---

## Phase 75 — Transactions: Summary Card Polish & Interactive Calendar View

### Feature
Polished the Transactions page summary cards to match the Home page design system, and replaced the "Calendar view coming soon" placeholder with a fully functional interactive calendar.

### UX Design & Changes

**Summary Cards**
- **Renamed**: "Net" card renamed to "Net Savings" for clarity.
- **Indicator dots**: Each card title now has a small colored dot (green for Income/Net Savings positive, red for Expenses/Net Savings negative) matching the Home page design language.
- **Inline trend metric**: Replaced percentage-based trend badges (`↑ 1236%`) with absolute shorthand currency values (`↑ ₹10.2K`, `↓ ₹1.5L`). The secondary trend now sits on the same horizontal line as the primary amount, right-aligned with a visual gap — slightly smaller and muted (`text-[11px] text-gray-400`) to preserve hierarchy.

**Interactive Calendar View**
- **Removed placeholder**: Deleted the "Calendar view coming soon" empty state.
- **Live data**: `TransactionCalendar` with `inline` prop now renders directly in the Transactions view. Fixed a bug where the `useEffect` gated on `open` (always false in inline mode), preventing data from ever loading. Now correctly fetches on mount when `inline={true}`.
- **Dual daily indicators**: Each day cell now shows a separate green income number and a separate red expense number (stacked), rather than a single merged blue value — satisfying the "if income show green, if expense show red" requirement.
- **Day cell background**: Days with both income and expense render a subtle top-green-to-bottom-red gradient background instead of the previous blue wash.
- **Legend simplified**: Removed the "Both" legend entry; replaced with accurate green/red pair.
- **Drill-down**: Clicking any day with transactions reveals the full transaction list for that day (implemented via the existing side-panel/inline view in `TransactionCalendar`).

---

## Phase 76 — Dashboard: Category Chart Segmented Control & High-Density Layout

### Feature
Replaced the "Expenses by category" month dropdown with a Weekly/Monthly segmented control matching the TrendChartCard, and tightened both chart cards to a higher-density layout.

### UX Design & Changes

**Functional Consistency (CategoryPieChart)**
- **Removed**: Month dropdown (ChevronDown button + 6-month options list) from CategoryPieChart.
- **Added**: Pill-shaped segmented control ("Weekly" / "Monthly") with identical styling to TrendChartCard — `h-7`, `rounded-full`, `bg-gray-100` container, white active pill with `shadow-sm`, `text-xs font-semibold`.
- **Live backend connection**: Dashboard server computes two separate category datasets — `categoryData` (current-month 1st–last) and `weeklyCategoryData` (current week Sun–Sat, derived from `allTxns`). Both are passed as props; the component renders whichever matches the active toggle state.
- **Dynamic title**: Card title updates to "Weekly expenses" / "Monthly expenses" to mirror the "Weekly trend" / "Monthly trend" pattern on TrendChartCard.
- **"View all" dialog**: Period label in the subtitle updates dynamically ("total this week" / "total this month").

**Spatial Refinement (High-Density Layout)**
- **CategoryPieChart**: `p-5` → `p-4`; header `mb-4` → `mb-2` (50% reduction); donut `height={200}` → `height={170}`; inner radius 55 → 48, outer radius 85 → 75; legend gap `gap-4` → `gap-3`; empty state `h-[240px]` → `h-[200px]`.
- **TrendChartCard**: `p-5` → `p-4`; header `mb-4` → `mb-2`.
- **MonthlyBarChart**: `height={280}` → `height={240}`; empty state `h-[280px]` → `h-[240px]`.
