# CLAUDE.md — Budget & Expense Tracker

## Project Overview
A budget and expense tracker built with **Next.js**, **Drizzle ORM**, and **PostgreSQL**.
AI features are powered by the **OpenAI API** (`gpt-4o`).

---

## Tech Stack
- **Frontend**: Next.js (App Router)
- **ORM**: Drizzle
- **Database**: PostgreSQL
- **AI**: OpenAI API (`openai` SDK)

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
  ai/
    openai.ts        # OpenAI client + shared helper
  db/
    schema.ts        # Drizzle schema
    index.ts         # DB client
components/          # Shared UI components
```

---

## AI Integration

### Provider
- **Model**: `gpt-4o`
- **SDK**: `openai`
- **Key**: `OPENAI_API_KEY` in `.env.local` (never commit the real key)
- **Install**: `npm install openai`

### Core Rule
All OpenAI API calls must happen **server-side only** — API routes or Server Actions.
Never expose `OPENAI_API_KEY` to the client under any circumstances.

### Shared Client
The OpenAI client lives at `lib/ai/openai.ts`. Always import from there —
never instantiate `new OpenAI()` directly in route files.

Example `lib/ai/openai.ts`:
```ts
import OpenAI from "openai";

export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function chat(systemPrompt: string, userPrompt: string): Promise<string> {
  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    temperature: 0.3,
  });
  return response.choices[0].message.content ?? "";
}
```

### JSON Responses
When expecting structured JSON output from the model, use `response_format`:
```ts
const response = await openai.chat.completions.create({
  model: "gpt-4o",
  messages: [...],
  response_format: { type: "json_object" },
  temperature: 0.2,
});
const parsed = JSON.parse(response.choices[0].message.content ?? "{}");
```

### Error Handling
Every AI call must be wrapped in try/catch. If OpenAI fails:
- Log the error server-side
- Return a graceful fallback to the client (empty state, not a crash)
- Never block core app functionality (adding expenses, viewing budgets) due to an AI failure

### Loading States
Every AI-powered UI element must show a loading skeleton or spinner while
the request is in-flight. Never show a blank space or stale data silently.

### Data Integrity
The model must only analyze data fetched fresh from the DB.
Never ask the model to estimate, invent, or fill in missing numbers.

---

## Active AI Features

### 1. Smart Expense Categorization
- **Route**: `POST /api/ai/categorize`
- **Trigger**: User finishes typing expense description (600ms debounce)
- **Input**: `{ description: string, amount: number }`
- **Output**: `{ category: string, confidence: "high" | "medium" | "low", reason: string }`
- **Implementation**:
  - Fetch existing categories dynamically from the DB
  - Use `response_format: { type: "json_object" }` for reliable parsing
  - System prompt: instruct the model to return only the JSON shape above
- **UI**: Dismissible suggestion near the category field — user must confirm, never auto-select
- **Fallback**: If AI fails, show no suggestion; category field remains manual

### 2. Spending Insights & Summaries
- **Route**: `GET /api/ai/insights?month=YYYY-MM`
- **Trigger**: Dashboard load (cached) + manual "Refresh" button
- **Data sent to model**:
  - Total spent vs. total budget for the month
  - Spending breakdown by category (amount + % of total)
  - Top 5 largest individual expenses
  - Week-over-week or day-of-week patterns if available
- **Output**: 3–5 sentence plain-English summary highlighting what's notable
- **Caching**: Store result per user per month in DB or in-memory — do not re-call the API on every page load
- **UI**: Insights card on the dashboard with loading skeleton and "Refresh" button

### 3. Budget Recommendations
- **Route**: `POST /api/ai/budget-recommendations`
- **Trigger**: Manual only — user clicks "Get Recommendations" button
- **Data sent to model**: Current budgets + last 3 months of actual spend per category
- **Output** (use `response_format: { type: "json_object" }`):
  ```json
  {
    "recommendations": [
      {
        "category": "string",
        "currentBudget": 0,
        "suggestedBudget": 0,
        "reasoning": "string"
      }
    ]
  }
  ```
- **UI**: Comparison table with "Apply" per row and "Apply All" button — applying writes to DB via existing budget update flow

### 4. Anomaly / Overspending Alerts
- **Route**: `GET /api/ai/anomalies`
- **Trigger**: Dashboard load, throttled to once per hour per user
- **Data sent to model**: Current month expenses + previous 2 months as baseline per category
- **Output** (use `response_format: { type: "json_object" }`):
  ```json
  {
    "alerts": [
      {
        "type": "overspend | unusual_transaction | budget_exceeded",
        "category": "string",
        "message": "string",
        "severity": "warning | critical"
      }
    ]
  }
  ```
- **Detection criteria to include in the prompt**:
  - Category spending >30% above the 2-month average
  - Single transaction unusually large for its category
  - Budget already exceeded before month-end
- **UI**: Dismissible banners or notification badges using existing toast/notification patterns
- **Throttle**: Store last-checked timestamp in DB or cookie; skip the API call if checked within the last hour

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