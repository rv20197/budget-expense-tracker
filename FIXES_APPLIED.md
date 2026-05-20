# Fixes Applied

All fixes were applied on the `master` branch. TypeScript typecheck passes
(`npm run typecheck`) with zero errors before and after every change.
There are no automated test suites in this project, so verification was done
via typecheck + manual code review.

---

## 1. Edge-level middleware guard was never active
**Commit:** `fix(security): activate edge-level middleware guard`  
**Files changed:** `proxy.ts` (tombstoned), `middleware.ts` (created)

**What was fixed:**  
`proxy.ts` exported a function named `proxy`. Next.js only activates a file
named `middleware.ts` with an export named `middleware`. The entire edge-level
auth guard — including redirect-to-login for unauthenticated users and
redirect-to-onboarding for users without a household — was completely inactive.
All protection was falling through to individual layout components only.

**Why it was risky:**  
Server Actions and API routes still enforced auth, but the UX-level routing
guard was completely broken. Authenticated users who deleted their household
membership could navigate directly to `/dashboard/*` without being redirected
to `/onboarding`.

**Follow-up:** None required.

---

## 2. Rate limiter keyed by the string `"server-action"` instead of real IP
**Commit:** `fix(security): rate-limit login attempts by real client IP`  
**Files changed:** `src/features/auth/actions/auth.actions.ts`, `src/lib/auth/rate-limit.ts`

**What was fixed:**  
`loginAction` called `loginUser(payload, "server-action")` — the literal string
`"server-action"` was used as the rate-limit key. Every login attempt from every
user in the world shared a single sliding-window bucket, making the rate limiter
effectively disabled (5 attempts per 15 min shared globally = never triggered).

Now reads `x-forwarded-for` (with `x-real-ip` fallback) from request headers via
`next/headers` and passes the real client IP to `loginUser`.

**Why it was risky:**  
The rate limiter was the only brute-force protection on the login endpoint.
Without it, credentials could be enumerated indefinitely.

**Follow-up:** The rate limiter uses an in-memory `Map` (documented with a
comment in `rate-limit.ts`). This resets on process restart and does not
coordinate across multiple Node.js instances. For production multi-instance
deployments, replace with a Redis-backed sliding-window counter.

---

## 3. `getDebtSummary` accepted a `householdId` parameter that bypassed auth
**Commit:** `fix(security): remove householdId bypass in getDebtSummary`  
**Files changed:** `src/features/debts/actions/debt.actions.ts`, `src/app/(dashboard)/debt/page.tsx`, `src/app/(dashboard)/dashboard/page.tsx`

**What was fixed:**  
`getDebtSummary(householdId?: string)` — when called with a `householdId`
argument, the function skipped `getAuthContext()` entirely and used the passed
value directly. A caller could read debt summary data for any household without
authenticating.

Removed the parameter. The function now always derives `householdId` from the
authenticated session. Updated the two call sites accordingly.

**Why it was risky:**  
Information disclosure — an attacker who knew or guessed a valid `householdId`
UUID could read financial summary data for that household without authentication.

**Follow-up:** None required.

---

## 4. `getMonthOptions` hardcoded year 2026
**Commit:** `fix: use current year in getMonthOptions instead of hardcoded 2026`  
**Files changed:** `src/lib/utils.ts`

**What was fixed:**  
`getMonthOptions()` passed the literal `2026` to `formatMonthYear()` when
generating month label strings. In locales that format month names differently
depending on the year (e.g. Japanese Imperial era calendars), this produces
wrong labels in any other year.

Changed to `new Date().getFullYear()`.

**Why it was risky:**  
Silent data corruption in locale-aware month displays. Would produce incorrect
labels in all years other than 2026.

**Follow-up:** None required.

---

## 5. `useAuth` hook was a silent stub
**Commit:** `chore: document stub useAuth hook with implementation guidance`  
**Files changed:** `src/features/auth/hooks/useAuth.ts`

**What was fixed:**  
`useAuth()` always returned `{ isAuthenticated: false, user: null }`. The hook
was not imported anywhere, but its existence without a warning comment was a
trap for any developer who tried to use it.

Added a detailed TODO comment explaining why the hook is a stub, how auth
actually works in this codebase, and what is needed to implement it properly.

**Why it was risky:**  
Any client component that consumed this hook would silently behave as if the
user is unauthenticated, hiding UI or breaking conditional renders with no
error or warning.

**Follow-up:** Implement the hook if client-side auth state is ever needed
(e.g. via a React context populated from a server-fetched session).

---

## 6. `getTrend` fired N×2 serial DB queries
**Commit:** `perf: replace getTrend N×2 serial queries with single GROUP BY`  
**Files changed:** `src/features/dashboard/actions/reports.actions.ts`

**What was fixed:**  
The previous implementation iterated over `months` in a loop and fired 2
parallel queries per month (one for income, one for expense). For a 6-month
trend this was 12 queries executed in sequence.

Replaced with a single `date_trunc('month', ...) GROUP BY` query that fetches
all months in one round-trip, then fills in missing months with zero in a JS
Map.

**Why it was risky:**  
Linear DB latency scaling with the number of months requested. The dashboard
and reports pages are already slow Server Components; unnecessary query
overhead compounds the issue.

**Follow-up:** None required.

---

## 7. `copyBudgetsToNextMonth` was an N+1 pattern
**Commit:** `perf: eliminate N+1 queries in copyBudgetsToNextMonth`  
**Files changed:** `src/features/budgets/actions/budgets.actions.ts`

**What was fixed:**  
The function looped over current-month budgets and issued a SELECT + INSERT or
UPDATE for each one — O(N) round-trips for N budgets.

Replaced with: one prefetch query for all existing next-month budgets, then a
JavaScript partition into "to insert" vs "to update", then a single transaction
with one batch insert and individual updates (batched updates require a unique
index that does not currently exist on the budgets table).

**Why it was risky:**  
Latency scales linearly with the number of budget categories. Also ran outside
a transaction in the original code, leaving the database in a partially-copied
state if an error occurred mid-loop.

**Follow-up:** Add a unique index on `(householdId, categoryId, month, year, scope, createdBy)`
to budgets to enable true `INSERT ... ON CONFLICT DO UPDATE` upserts and
eliminate the update loop entirely.

---

## 8. `getDebts` loaded all payment rows and then re-aggregated them in SQL
**Commit:** `perf: eliminate redundant payment aggregation query in getDebts`  
**Files changed:** `src/features/debts/actions/debt.actions.ts`

**What was fixed:**  
`getDebts` fired 3 parallel queries: debt rows, a payment totals aggregation
(`GROUP BY debtId`), and all individual payment rows. The totals query was
redundant — all individual payments were already loaded for the payment history
display. The total per debt can be computed in a single JS pass over the payment
rows.

Dropped the aggregation query; now uses `Decimal.js` to sum payment amounts
while grouping rows in one map iteration.

**Why it was risky:**  
The totals query performed a full table scan on `debt_payments` (filtered by
household) that was identical to what the full-row query already fetched —
double the I/O for no additional data.

**Follow-up:** If payment history grows very large (thousands of rows per
debt), consider paginating the payment list query rather than loading all rows.

---

## 9. CSV export endpoint had no row limit
**Commit:** `fix(perf): add 10k row hard limit to CSV export endpoint`  
**Files changed:** `src/app/api/transactions/export/route.ts`

**What was fixed:**  
The `GET /api/transactions/export` endpoint had no `LIMIT` clause, no
pagination, and no response size guard. A household with years of transaction
history could trigger a query that reads hundreds of thousands of rows into
Node.js memory in a single request.

Added a `10,000`-row hard cap with deterministic ordering (`ORDER BY
transaction_date`). Added `X-Export-Row-Count`, `X-Export-Row-Limit`, and
`X-Export-Truncated` response headers so the client can surface a truncation
warning.

**Why it was risky:**  
OOM or gateway timeout in production; potential denial-of-service for a
single user request.

**Follow-up:** Surface the `X-Export-Truncated` header to the user in the
export UI so they know to apply date filters if their export was capped.

---

## 10. `drizzle.config.ts` loaded `.env.local` only, not `.env`
**Commit:** `fix: load .env fallback in drizzle.config.ts; document stale /drizzle dir`  
**Files changed:** `drizzle.config.ts`, `drizzle/README.md` (created)

**What was fixed:**  
`drizzle.config.ts` called `config({ path: ".env.local" })` only. The project's
primary env file is `.env`. On machines without a `.env.local`, all `drizzle-kit`
commands (generate, migrate, push, studio) silently received an empty
`DATABASE_URL` and failed with a confusing DB connection error.

Added a second `config({ path: ".env" })` call. `dotenv` does not override
already-set keys, so `.env.local` values win when both files exist.

Also added `drizzle/README.md` documenting the stale root-level migration
directory (the config targets `src/db/migrations/`).

**Why it was risky:**  
Silent failure for all `drizzle-kit` commands in the default setup, making
schema migrations and DB inspection non-functional without manual workarounds.

**Follow-up:** Consider renaming `.env` to `.env.local` (and adding
`.env.local` to `.gitignore`) to align with the Next.js convention; or update
the example file name.

---

## 11. Cross-feature import: `budgetSchema` lived in the transactions feature
**Commit:** `refactor: resolve cross-feature budgetSchema import`  
**Files changed:** `src/features/budgets/schemas/budget.schemas.ts` (created), `src/features/budgets/actions/budgets.actions.ts`

**What was fixed:**  
`budgets.actions.ts` imported `budgetSchema` directly from
`@/features/transactions/schemas/finance.schemas` — a coupling where the
budgets feature depended on the internals of the transactions feature.

Created `src/features/budgets/schemas/budget.schemas.ts` as the proper entry
point for budget schemas, with the definition re-exported from the shared
finance schemas file. Updated the import in `budgets.actions.ts`.

**Why it was risky:**  
Implicit cross-feature coupling makes it easy to accidentally break budget
validation when refactoring transaction schemas.

**Follow-up:** Move the `budgetSchema` definition itself into
`budget.schemas.ts` (removing it from `finance.schemas.ts`) when time allows.

---

## 12. Pointless `requireSession()` wrapper in recurring actions
**Commit:** `chore: remove pointless requireSession() wrapper in recurring actions`  
**Files changed:** `src/features/recurring/actions/recurring.actions.ts`

**What was fixed:**  
A private `requireSession()` helper simply called and returned `getSession()`
with no additional logic or error handling. Replaced all three call sites with
direct `getSession()` calls.

**Why it was risky:**  
Indirection with no semantic meaning makes it harder to trace auth logic.

**Follow-up:** None required.

---

## Previously Deferred — Now Resolved

### DB-level `updatedAt` trigger
**Resolved in:** `feat(db): add DB-level updated_at trigger for all timestamped tables`  
Created `set_updated_at()` PL/pgSQL function and `BEFORE UPDATE` triggers on all
8 tables (`users`, `refresh_tokens`, `households`, `categories`, `transactions`,
`budgets`, `recurring_transactions`, `debts`) via migration
`0003_set_updated_at_triggers.sql`. Requires PostgreSQL 14+ (project uses PG 16).

### Cron process monitoring
**Resolved in:** `feat: add cron heartbeat monitoring and /api/health/cron endpoint`  
Added `cron_health` table (migration `0004_cron_health.sql`). `scripts/cron.ts`
writes a heartbeat upsert after every run (success or failure). `GET
/api/health/cron` returns 200 if the last successful run was within 2 hours
(2× the hourly schedule), or 503 with the last error details if stale. Heartbeat
write failures are caught and logged without crashing the cron process.

### Simple interest calculation edge case
**Resolved in:** `fix: correct simple interest base in payoff projection + add tests`  
`calculateProjection` was using `remainingBalance` (the current DB balance) as
the base for simple interest instead of the original `principal`. Added `principal`
parameter; simple interest now charges `principal × monthlyRate` (flat per period,
per the definition). Extracted pure `calculatePayoffMonths()` to
`src/features/debts/lib/projection.ts`; 13 Vitest tests cover NONE / SIMPLE /
COMPOUND cases including the regression scenario.

### Payment history pagination
**Resolved in:** `feat: paginate payment history — lazy load 10 per page`  
Removed the unbounded payment-row load from `getDebts` (derived `amountPaid` from
`principal − remainingBalance` instead). Added `getPaymentHistory(debtId, page)`
Server Action (10 rows/page, household-scoped auth check). Replaced
`PaymentHistoryTable` with `PaymentHistoryPanel` — a client component that lazy-
loads page 1 when "View History" is opened, with Previous/Next pagination controls.
