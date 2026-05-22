import { describe, it, expect, vi, beforeEach } from "vitest";

// ── hoisted mocks (defined before module resolution) ──────────────────────────
const { mockGetSession, mockDbSelect, mockCreate } = vi.hoisted(() => ({
  mockGetSession: vi.fn(),
  mockDbSelect: vi.fn(),
  mockCreate: vi.fn(),
}));

vi.mock("@/lib/auth/session", () => ({ getSession: mockGetSession }));
vi.mock("@/db", () => ({ db: { select: mockDbSelect } }));
vi.mock("@/lib/ai/openai", () => ({
  openai: { chat: { completions: { create: mockCreate } } },
}));

// ── helpers ───────────────────────────────────────────────────────────────────

/** Builds a Drizzle-like chainable mock that resolves to `data`. */
function chain(data: unknown[]) {
  const obj: Record<string, unknown> = {};
  for (const m of ["from", "where", "leftJoin", "innerJoin", "groupBy", "orderBy", "limit"]) {
    obj[m] = vi.fn().mockReturnValue(obj);
  }
  obj.then = (res: (v: unknown) => void, rej?: (e: unknown) => void) =>
    Promise.resolve(data).then(res, rej);
  return obj;
}

// ── imports (after mocks) ─────────────────────────────────────────────────────
import { getPrevMonths } from "./route";

// ── pure function tests ───────────────────────────────────────────────────────

describe("getPrevMonths", () => {
  it("returns the correct previous months for a mid-year month", () => {
    const result = getPrevMonths(5, 2025, 3);
    expect(result).toEqual([
      { month: 4, year: 2025 },
      { month: 3, year: 2025 },
      { month: 2, year: 2025 },
    ]);
  });

  it("wraps correctly across a year boundary (January)", () => {
    const result = getPrevMonths(1, 2025, 3);
    expect(result).toEqual([
      { month: 12, year: 2024 },
      { month: 11, year: 2024 },
      { month: 10, year: 2024 },
    ]);
  });

  it("wraps correctly across a year boundary (February)", () => {
    const result = getPrevMonths(2, 2025, 3);
    expect(result).toEqual([
      { month: 1, year: 2025 },
      { month: 12, year: 2024 },
      { month: 11, year: 2024 },
    ]);
  });

  it("returns an empty array when count is 0", () => {
    expect(getPrevMonths(5, 2025, 0)).toEqual([]);
  });

  it("returns a single previous month when count is 1", () => {
    expect(getPrevMonths(6, 2024, 1)).toEqual([{ month: 5, year: 2024 }]);
  });
});

// ── route handler tests ───────────────────────────────────────────────────────

// Import the POST handler dynamically so mocks apply
const { POST } = await import("./route");

const SESSION = {
  user: { id: "user-1", householdId: "hh-1", email: "test@example.com" },
};

const CAT_ID = "cat-uuid-1";

function makeRequest(body: unknown) {
  return new Request("http://localhost/api/ai/budget-recommendations", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/ai/budget-recommendations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    mockGetSession.mockResolvedValue(null);
    const res = await POST(makeRequest({ month: 5, year: 2025 }));
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.recommendations).toBeNull();
  });

  it("returns null recommendations for an invalid request body", async () => {
    mockGetSession.mockResolvedValue(SESSION);
    const res = await POST(makeRequest({ month: "bad", year: 2025 }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.recommendations).toBeNull();
  });

  it("returns empty array when no relevant categories exist", async () => {
    mockGetSession.mockResolvedValue(SESSION);
    // Two DB queries: categories+budgets join, spend query
    mockDbSelect
      .mockReturnValueOnce(chain([]))
      .mockReturnValueOnce(chain([]));

    const res = await POST(makeRequest({ month: 5, year: 2025 }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.recommendations).toEqual([]);
  });

  it("returns valid recommendations from AI on happy path", async () => {
    mockGetSession.mockResolvedValue(SESSION);

    mockDbSelect
      .mockReturnValueOnce(
        chain([{ categoryId: CAT_ID, categoryName: "Groceries", budgetAmount: "5000" }]),
      )
      .mockReturnValueOnce(
        chain([
          { categoryId: CAT_ID, monthStr: "2025-02", total: "4200" },
          { categoryId: CAT_ID, monthStr: "2025-03", total: "4800" },
          { categoryId: CAT_ID, monthStr: "2025-04", total: "5100" },
        ]),
      );

    mockCreate.mockResolvedValue({
      choices: [
        {
          message: {
            content: JSON.stringify({
              recommendations: [
                {
                  categoryId: CAT_ID,
                  category: "Groceries",
                  currentBudget: 5000,
                  suggestedBudget: 5500,
                  reasoning: "Spend has been consistently above budget.",
                },
              ],
            }),
          },
        },
      ],
    });

    const res = await POST(makeRequest({ month: 5, year: 2025 }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.recommendations).toHaveLength(1);
    expect(body.recommendations[0]).toMatchObject({
      categoryId: CAT_ID,
      category: "Groceries",
      suggestedBudget: 5500,
    });
  });

  it("filters out AI recommendations with unknown categoryIds", async () => {
    mockGetSession.mockResolvedValue(SESSION);

    mockDbSelect
      .mockReturnValueOnce(
        chain([{ categoryId: CAT_ID, categoryName: "Groceries", budgetAmount: "5000" }]),
      )
      .mockReturnValueOnce(chain([]));

    mockCreate.mockResolvedValue({
      choices: [
        {
          message: {
            content: JSON.stringify({
              recommendations: [
                {
                  categoryId: "invented-id",
                  category: "Groceries",
                  currentBudget: 5000,
                  suggestedBudget: 5500,
                  reasoning: "Spend is above budget.",
                },
              ],
            }),
          },
        },
      ],
    });

    const res = await POST(makeRequest({ month: 5, year: 2025 }));
    const body = await res.json();
    expect(body.recommendations).toHaveLength(0);
  });

  it("returns null when the OpenAI call throws", async () => {
    mockGetSession.mockResolvedValue(SESSION);

    mockDbSelect
      .mockReturnValueOnce(
        chain([{ categoryId: CAT_ID, categoryName: "Groceries", budgetAmount: "5000" }]),
      )
      .mockReturnValueOnce(chain([]));

    mockCreate.mockRejectedValue(new Error("OpenAI down"));

    const res = await POST(makeRequest({ month: 5, year: 2025 }));
    const body = await res.json();
    expect(body.recommendations).toBeNull();
  });
});
