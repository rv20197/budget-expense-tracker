# AGENTS.md

## Project: Budget Tracker

Full-stack Next.js 16.2 app with App Router, Drizzle ORM (PostgreSQL),
and hand-rolled JWT auth (jose + bcrypt). No NextAuth, no Prisma.

## Stack

- Framework: Next.js 16.2 (App Router only, no Pages Router)
- Language: TypeScript (strict mode)
- Styling: Tailwind CSS v4
- DB: PostgreSQL via Drizzle ORM
- Auth: jose (JWT) + bcrypt — fully hand-rolled
- Validation: Zod (client + server)
- Forms: React Hook Form + Zod resolver
- Charts: Recharts
- Toasts: Sonner
- Decimal math: Decimal.js (never use native float for money)

## Architecture Rules

- Server Components by default; "use client" only where interactivity needed
- All mutations via Server Actions — never fetch() to own API from client
- Route Handlers only for: /api/auth/\* and /api/transactions/export
- proxy.ts for route protection (NOT middleware.ts — renamed in Next.js 16)
- `use cache` directive on expensive dashboard/reports DB reads
- Turbopack is default — never add --turbopack flag
- reactCompiler: true in next.config.ts

## Auth Rules

- Tokens: accessToken (15min) + refreshToken (7d), both signed with jose
- Store only SHA-256 hash of refreshToken in refresh_tokens DB table
- Both tokens set as httpOnly, Secure, SameSite=Lax cookies
- Refresh token rotated on every use (delete old row, insert new)
- All refresh_tokens wiped on password change
- Login rate limit: 5 attempts / 15 min per IP (in-memory Map)
- getSession() in lib/auth/session.ts reads + verifies accessToken from cookies()
- Every Server Action calls getSession() first — return error if null

## DB Rules

- All DB ops via Drizzle ORM — no raw SQL unless unavoidable
- All monetary values: numeric(12,2) in DB, Decimal.js in code
- UUIDs as primary keys (gen_random_uuid())
- CASCADE deletes via FK constraints

## Code Style

- Always return typed results from Server Actions:
  { success: true, data } | { success: false, error: string, fieldErrors? }
- Never expose raw DB or internal errors to the client
- Zod schemas live in lib/validations/
- Empty states, loading skeletons (Suspense), and error boundaries on all pages
- Confirm modal before any destructive action
- Sonner toasts for all CRUD results

## Testing

- After each task run: `npm run build` must pass with zero errors
- Run `npx tsc --noEmit` to check types
- Run `drizzle-kit generate` if schema changes are made

```

---

**Step 2 — Delegate tasks one at a time to Codex**

Paste these tasks individually into Codex, in order:
```

Task 1:
Set up the project foundation. Install all dependencies
(drizzle-orm, drizzle-kit, pg, jose, bcryptjs, zod,
react-hook-form, recharts, sonner, decimal.js, concurrently,
tsx, node-cron). Create next.config.ts with reactCompiler: true.
Create drizzle.config.ts. Create docker-compose.yml with postgres:16
and pgadmin services. Create .env.local.example with all required vars.
Update package.json scripts as per AGENTS.md.

```

```

Task 2:
Create the full Drizzle schema in lib/db/schema.ts with these tables:
users, refresh_tokens, categories, transactions, budgets,
recurring_transactions — exactly as specified in AGENTS.md constraints.
Create lib/db/index.ts with the Drizzle pg client singleton.
Generate and run migrations.

```

```

Task 3:
Build the complete hand-rolled auth system:

- lib/auth/verify-token.ts (jose jwtVerify wrapper)
- lib/auth/session.ts (getSession helper using cookies())
- lib/auth/hash.ts (hashPassword, comparePassword with bcryptjs)
- lib/auth/cookies.ts (setAuthCookies, clearAuthCookies)
- lib/auth/rate-limit.ts (in-memory Map rate limiter)
- All 4 Route Handlers: /api/auth/register, login, refresh, logout
- proxy.ts protecting all /(dashboard) routes
- Zod schemas for all auth inputs in lib/validations/auth.schemas.ts

```

```

Task 4:
Build the app shell layout:

- app/(auth)/login/page.tsx and register/page.tsx with RHF forms
- app/(dashboard)/layout.tsx with sidebar + topbar
- Sidebar with nav links to all pages + logout button
- Responsive: drawer on mobile, fixed on desktop
- Reusable UI components: Button, Input, Modal, Badge, Skeleton, Select

```

```

Task 5:
Build Transactions feature end-to-end:

- lib/actions/transactions.actions.ts (getTransactions with filters +
  pagination, createTransaction, updateTransaction, deleteTransaction,
  bulkDeleteTransactions in Drizzle transaction())
- app/(dashboard)/transactions/page.tsx (Server Component, searchParams filters)
- TransactionTable, TransactionForm modal, BulkDeleteBar components
- GET /api/transactions/export Route Handler (CSV streaming)

```

```

Task 6:
Build Categories feature end-to-end:

- lib/actions/categories.actions.ts (full CRUD)
- app/(dashboard)/categories/page.tsx with Income/Expense tabs
- ReassignModal: if category has transactions, block delete and prompt
  reassignment to another category first
- Seed default categories (Food, Transport, Housing, Healthcare,
  Entertainment, Salary, Freelance) on new user registration

```

```

Task 7:
Build Budgets feature end-to-end:

- lib/actions/budgets.actions.ts (getBudgets, upsertBudget,
  deleteBudget, copyBudgetsToNextMonth)
- app/(dashboard)/budgets/page.tsx with month/year selector
- BudgetCard with progress bar: green <75%, yellow 75-99%, red ≥100%
- OverBudgetBanner at top of page when any category exceeds limit
- "Copy to Next Month" button

```

```

Task 8:
Build Recurring Transactions feature + cron job:

- lib/actions/recurring.actions.ts (full CRUD)
- app/(dashboard)/recurring/page.tsx with upcoming 30-day list
- scripts/cron.ts using node-cron (runs hourly):
  → Query active recurring where next_due_date <= today
  → Insert transaction rows
  → Recalculate next_due_date correctly:
  MONTHLY: same day next month, clamped to last day (e.g. Jan 31 → Feb 28)
  YEARLY: same day next year, handle Feb 29 → Feb 28 on non-leap years

```

```

Task 9:
Build Dashboard and Reports pages:

- lib/actions/reports.actions.ts (getMonthlySummary, getCategoryBreakdown,
  getTrend) — all with `use cache` directive
- app/(dashboard)/dashboard/page.tsx: summary cards, bar chart
  (income vs expense), donut chart (expense by category),
  recent 5 transactions, budget progress bars, date range filter
- app/(dashboard)/reports/page.tsx: monthly summary table,
  top 5 spending categories, 6-month trend line chart
- All charts using Recharts

```

```

Task 10:
Build Settings page and finalize:

- lib/actions/user.actions.ts (updateProfile, changePassword, deleteAccount)
- app/(dashboard)/settings/page.tsx: profile form, change password form,
  delete account section (type "DELETE" to confirm)
- changePassword must wipe all refresh_tokens for the user
- Add loading.tsx (Suspense skeletons) and error.tsx to (dashboard)
- Add 404 not-found.tsx
- Write full README with setup steps
- Final: `npm run build` must pass with zero TypeScript errors


## Debt Management Rules

- Two debt directions: DEBT (you owe someone) | LOAN (someone owes you)
- Interest types supported: SIMPLE | COMPOUND | NONE
- All interest calculations use Decimal.js — never native float
- Payments reduce principal first if no interest due, otherwise interest first
- Paid-off debts (remaining_balance <= 0) auto-marked as PAID — never deleted
- Debt payments are NOT linked to the transactions table — separate payment_history
- Dashboard shows a "Debt Summary" card — total owed + total to collect
- Never hard-delete a debt — use status: ACTIVE | PAID | CANCELLED
```

---

## Part 2 — Paste this as the next task into Codex
```
Task 11:
Build the Debt Management feature end-to-end. 
Follow all rules in AGENTS.md including the new Debt Management Rules section.

--- SCHEMA ---

Add these new tables to lib/db/schema.ts:

debts
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid()
  user_id           uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE
  name              text NOT NULL           -- e.g. "Car Loan", "John owes me"
  direction         text NOT NULL           -- 'DEBT' (I owe) | 'LOAN' (owed to me)
  counterparty      text NOT NULL           -- lender or borrower name
  principal         numeric(12,2) NOT NULL  -- original amount
  remaining_balance numeric(12,2) NOT NULL  -- decreases with payments
  interest_rate     numeric(5,2) NOT NULL DEFAULT 0   -- annual % (0 if none)
  interest_type     text NOT NULL DEFAULT 'NONE'      -- 'SIMPLE' | 'COMPOUND' | 'NONE'
  due_date          date                    -- final payoff deadline (nullable)
  next_payment_date date                    -- next installment due (nullable)
  installment_amount numeric(12,2)          -- fixed EMI amount (nullable)
  status            text NOT NULL DEFAULT 'ACTIVE'  -- 'ACTIVE' | 'PAID' | 'CANCELLED'
  notes             text
  created_at        timestamp DEFAULT now()
  updated_at        timestamp DEFAULT now()

debt_payments
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid()
  debt_id      uuid NOT NULL REFERENCES debts(id) ON DELETE CASCADE
  user_id      uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE
  amount       numeric(12,2) NOT NULL
  paid_on      date NOT NULL
  note         text
  created_at   timestamp DEFAULT now()

Run drizzle-kit generate and drizzle-kit migrate after adding tables.

--- SERVER ACTIONS (lib/actions/debt.actions.ts) ---

All actions must call getSession() first and return typed results.

getDebts()
  → Return all debts for user (status: ACTIVE | PAID | CANCELLED)
  → Include sum of debt_payments per debt as amount_paid
  → Separate into two lists: debts (direction=DEBT) and loans (direction=LOAN)

createDebt(input)
  → Validate with Zod: name, direction, counterparty, principal, 
    interest_rate, interest_type, due_date, next_payment_date, 
    installment_amount, notes
  → Set remaining_balance = principal on create
  → status defaults to ACTIVE

updateDebt(id, input)
  → Allow editing: name, counterparty, interest_rate, due_date,
    next_payment_date, installment_amount, notes
  → Do NOT allow editing principal or direction after creation
  → Recalculate nothing — just update fields

recordPayment(debtId, { amount, paid_on, note })
  → Validate amount > 0 and amount <= remaining_balance
  → Insert into debt_payments
  → Update debts.remaining_balance -= amount (use Decimal.js)
  → Update debts.updated_at
  → If remaining_balance <= 0:
      → Set remaining_balance = 0
      → Set status = 'PAID'
  → If next_payment_date is set, advance it by 1 month (clamp to month-end)
  → Wrap insert + update in Drizzle transaction()
  → revalidatePath('/debt')

cancelDebt(id)
  → Set status = 'CANCELLED', updated_at = now()
  → Do NOT delete — keep record

deletePayment(paymentId)
  → Delete from debt_payments
  → Recalculate remaining_balance:
      remaining_balance = principal - SUM(debt_payments.amount) for this debt
  → If remaining_balance > 0 and status = 'PAID' → set status back to 'ACTIVE'
  → Wrap in Drizzle transaction()

getDebtSummary()
  → Total remaining DEBT balance (direction=DEBT, status=ACTIVE)
  → Total remaining LOAN balance (direction=LOAN, status=ACTIVE)
  → Count of overdue debts (next_payment_date < today, status=ACTIVE)
  → Count of debts due in next 7 days
  → Used on dashboard — add `use cache` directive

getPayoffProjection(debtId)
  → If installment_amount is set:
      → Calculate estimated months to payoff based on remaining_balance,
        installment_amount, interest_rate, interest_type using Decimal.js
      → Return projected payoff date
  → If no installment_amount → return null (no projection available)

--- ZOD SCHEMAS (lib/validations/debt.schemas.ts) ---

createDebtSchema
  → name: min 1, max 100
  → direction: enum ['DEBT', 'LOAN']
  → counterparty: min 1, max 100
  → principal: positive decimal, max 2 decimal places
  → interest_rate: 0–100, max 2 decimal places
  → interest_type: enum ['SIMPLE', 'COMPOUND', 'NONE']
  → due_date: optional valid date
  → next_payment_date: optional valid date
  → installment_amount: optional positive decimal
  → notes: optional string max 500

recordPaymentSchema
  → amount: positive decimal, max 2 decimal places
  → paid_on: valid date, not in the future
  → note: optional string max 200

--- PAGE (app/(dashboard)/debt/page.tsx) ---

Server Component. Fetches all debts via getDebts(). Passes to client components.

Layout:
  → Two tabs at top: "My Debts" (I owe) | "My Loans" (owed to me)

Summary strip (top of page, always visible):
  → Card: Total I Owe (sum of DEBT remaining balances)
  → Card: Total Owed to Me (sum of LOAN remaining balances)
  → Card: Overdue Payments (count, in red if > 0)
  → Card: Due in 7 Days (count, in yellow if > 0)

Debt card (DebtCard component) for each debt/loan:
  → Shows: name, counterparty, direction badge, status badge
  → Progress bar: amount paid / principal (green fill)
  → Remaining balance prominently displayed
  → Interest rate + type badge (hide if NONE)
  → Due date (red if overdue, yellow if within 7 days)
  → Next payment date with installment amount
  → "Record Payment" button → opens RecordPaymentModal
  → "View History" button → expands inline payment history table
  → "Edit" button → opens EditDebtModal
  → "Cancel Debt" button (only if ACTIVE) → confirm modal → cancelDebt action
  → PAID debts: show green "Paid Off" banner, disable Record Payment
  → CANCELLED debts: show grey "Cancelled" banner, collapsed by default

Payment history (inline expandable per debt card):
  → Table: date, amount, note, delete button
  → Delete button → confirm modal → deletePayment action
  → Show total paid at bottom of table

Payoff projection (inside DebtCard, only if installment_amount is set):
  → "Estimated payoff: [Month Year]" shown below progress bar
  → Fetch from getPayoffProjection — compute client-side from returned data

Add Debt button (floating or top-right):
  → Opens CreateDebtModal
  → Separate forms for direction: DEBT vs LOAN
    (label changes: "Lender Name" vs "Borrower Name")

Filter bar:
  → Filter by status: All | Active | Paid | Cancelled
  → Sort by: Due Date | Remaining Balance | Created Date

--- COMPONENTS ---

components/debt/
  DebtCard.tsx              ← main card with all actions
  CreateDebtModal.tsx       ← RHF form, Zod validation
  EditDebtModal.tsx         ← same form, pre-filled, principal/direction locked
  RecordPaymentModal.tsx    ← amount, paid_on, note
  PaymentHistoryTable.tsx   ← inline expandable table with delete
  DebtSummaryStrip.tsx      ← 4 summary cards at top of page

--- DASHBOARD INTEGRATION ---

Update app/(dashboard)/dashboard/page.tsx:
  → Add a "Debt Overview" section below the budget progress bars
  → Show: Total I Owe, Total Owed to Me, count of overdue payments
  → Each card links to /debt
  → Data from getDebtSummary() (cached with `use cache`)

--- SIDEBAR ---

Add "Debt" nav item to the sidebar in app/(dashboard)/layout.tsx
with an appropriate icon, between Recurring and Reports.

--- EDGE CASES ---

- Payment amount > remaining_balance → Zod error "Amount exceeds remaining balance"
- Recording payment on PAID or CANCELLED debt → Server Action returns error
- Deleting a payment that would push balance negative → prevent, return error
- interest_type = NONE → hide interest fields in UI, treat rate as 0
- All balance math uses Decimal.js — no native arithmetic anywhere
- Empty state: no debts → show illustration + "Add your first debt" CTA
- PAID debts sorted to bottom of list automatically
- If due_date < today and status = ACTIVE → show "Overdue" badge in red
- Mobile: DebtCard stacks vertically, payment history scrolls horizontally

--- AFTER IMPLEMENTATION ---

Run: npm run build — must pass with zero TypeScript errors
Run: npx tsc --noEmit — must be clean
Run: drizzle-kit generate if schema was changed