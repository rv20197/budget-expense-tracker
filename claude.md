# CLAUDE.md — Budget & Expense Tracker

## Project Overview
A budget and expense tracker built with **Next.js**, **Drizzle ORM**, and **PostgreSQL**.

---

## Tech Stack
- **Frontend**: Next.js (App Router)
- **ORM**: Drizzle
- **Database**: PostgreSQL

---

## Commands
> Update these to match your actual scripts if they differ.

```bash
npm run dev          # Start development server
npm run build        # Production build
npm run db:push      # Push Drizzle schema changes
npm run db:studio    # Open Drizzle Studio
npm run lint         # Run ESLint
```

---

## Project Structure
> Update paths below if your structure differs.

```
app/
  api/
    ai/              # All AI-related API routes live here
      categorize/
      insights/
      budget-recommendations/
      anomalies/
  (dashboard)/       # Main app pages
lib/
  db/
    schema.ts        # Drizzle schema
    index.ts         # DB client
components/          # Shared UI components
```

---


## General Coding Rules

- **Read before writing**: Always inspect a file before editing it. Never guess at
  schema column names, route signatures, or component props.
- **Match existing patterns**: Follow the folder structure, naming conventions, error
  handling style, and data-fetching patterns already present in the codebase.
- **One concern per file**: AI route handlers fetch data from DB, call the model, and
  return structured responses — keep DB logic and prompt logic in separate functions.
- **TypeScript**: Keep types strict. Update or create types for all new AI request/response
  shapes. Never use `any` for AI response payloads.
- **Do not break existing functionality**: Expense CRUD, budget management, and all
  existing pages must continue to work regardless of AI feature status.
- **After completing any change**: List every file created or modified with a one-line
  description of what changed.