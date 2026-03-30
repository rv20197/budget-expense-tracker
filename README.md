# Budget Expense Tracker

Full-stack budget tracker built with Next.js 16.2 App Router, Drizzle ORM, PostgreSQL, hand-rolled JWT auth, Tailwind CSS v4, Recharts, Sonner, React Hook Form, and Zod.

## Stack

- Next.js 16.2 with App Router
- TypeScript in strict mode
- Tailwind CSS v4
- PostgreSQL + Drizzle ORM
- Hand-rolled JWT auth with `jose`
- Password hashing with `bcryptjs`
- Validation with Zod
- Forms with React Hook Form
- Charts with Recharts
- Toasts with Sonner
- Decimal-safe money handling with Decimal.js

## Features

- Access/refresh token auth with refresh rotation and secure cookies
- In-memory login rate limiting
- Protected dashboard routes via `proxy.ts`
- Transactions CRUD with filters, pagination, bulk delete, and CSV export
- Categories CRUD with reassignment flow before deleting used categories
- Budget planning with monthly copy-forward and over-budget warnings
- Recurring transactions with hourly cron processing
- Dashboard and reports with cached server reads and Recharts visualizations
- Profile updates, password change, and account deletion

## Environment

Copy `.env.local.example` to `.env.local` and update the values if needed:

```bash
cp .env.local.example .env.local
```

Required variables:

- `DATABASE_URL`
- `JWT_ACCESS_SECRET`
- `JWT_REFRESH_SECRET`
- `ACCESS_TOKEN_EXPIRES_IN`
- `REFRESH_TOKEN_EXPIRES_IN`
- `BCRYPT_SALT_ROUNDS`
- `APP_URL`

## Local Setup

1. Install dependencies:

```bash
npm install
```

2. Start PostgreSQL and pgAdmin with Docker:

```bash
docker compose up -d
```

3. Generate and apply migrations:

```bash
npm run db:generate
npm run db:migrate
```

4. Start the app:

```bash
npm run dev
```

5. Optional: run the app and cron worker together:

```bash
npm run dev:full
```

## Useful Scripts

- `npm run dev` - start Next.js
- `npm run dev:full` - start Next.js and the cron worker together
- `npm run build` - production build
- `npm run start` - start production server
- `npm run lint` - run ESLint
- `npm run typecheck` - run TypeScript checks
- `npm run db:generate` - generate Drizzle migrations
- `npm run db:migrate` - apply migrations
- `npm run db:studio` - open Drizzle Studio
- `npm run cron` - start the recurring transaction worker

## Auth Notes

- `accessToken` expires in 15 minutes by default.
- `refreshToken` expires in 7 days by default.
- Only the SHA-256 hash of the refresh token is stored.
- Refresh tokens are rotated on every refresh request.
- Changing the password clears all stored refresh tokens for the user.

## Cron Behaviour

The cron worker runs hourly and:

- finds active recurring transactions due today or earlier
- inserts matching rows into `transactions`
- advances `next_due_date`
- clamps month/year boundaries correctly for dates like January 31 and February 29

## Verification

The project should be verified with:

```bash
npx tsc --noEmit
npm run build
```

## Notes

- The current workspace used for implementation did not have Docker installed, so migrations were generated but not applied here.
- The generated SQL migration lives in `drizzle/0000_brown_enchantress.sql`.
