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
| Notifications | Sonner | `<Toaster richColors position="top-right" />` in root layout |
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
