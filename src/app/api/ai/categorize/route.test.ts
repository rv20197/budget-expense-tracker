import { describe, it, expect, vi, beforeEach } from "vitest";

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

function chain(data: unknown[]) {
  const obj: Record<string, unknown> = {};
  for (const m of ["from", "where", "leftJoin", "innerJoin", "groupBy", "orderBy", "limit"]) {
    obj[m] = vi.fn().mockReturnValue(obj);
  }
  obj.then = (res: (v: unknown) => void, rej?: (e: unknown) => void) =>
    Promise.resolve(data).then(res, rej);
  return obj;
}

const { POST } = await import("./route");

const SESSION = {
  user: { id: "user-1", householdId: "hh-1", email: "test@example.com" },
};

function makeRequest(body: unknown) {
  return new Request("http://localhost/api/ai/categorize", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/ai/categorize", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 with null suggestion when not authenticated", async () => {
    mockGetSession.mockResolvedValue(null);
    const res = await POST(makeRequest({ description: "Grocery run" }));
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.suggestion).toBeNull();
  });

  it("returns null suggestion for an invalid request body", async () => {
    mockGetSession.mockResolvedValue(SESSION);
    const res = await POST(makeRequest({ description: "" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.suggestion).toBeNull();
  });

  it("returns null when no categories exist for the household", async () => {
    mockGetSession.mockResolvedValue(SESSION);
    mockDbSelect.mockReturnValueOnce(chain([]));

    const res = await POST(makeRequest({ description: "Grocery run" }));
    const body = await res.json();
    expect(body.suggestion).toBeNull();
  });

  it("returns a valid suggestion on happy path", async () => {
    mockGetSession.mockResolvedValue(SESSION);
    mockDbSelect.mockReturnValueOnce(
      chain([{ id: "cat-1", name: "Groceries" }]),
    );

    mockCreate.mockResolvedValue({
      choices: [
        {
          message: {
            content: JSON.stringify({
              category: "Groceries",
              confidence: "high",
              reason: "Description mentions grocery shopping.",
            }),
          },
        },
      ],
    });

    const res = await POST(makeRequest({ description: "Grocery run", amount: 500 }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.suggestion).toEqual({
      categoryId: "cat-1",
      categoryName: "Groceries",
      confidence: "high",
      reason: "Description mentions grocery shopping.",
    });
  });

  it("returns null when AI returns a category name not in the household list", async () => {
    mockGetSession.mockResolvedValue(SESSION);
    mockDbSelect.mockReturnValueOnce(
      chain([{ id: "cat-1", name: "Groceries" }]),
    );

    mockCreate.mockResolvedValue({
      choices: [
        {
          message: {
            content: JSON.stringify({
              category: "Entertainment",
              confidence: "medium",
              reason: "Looks like entertainment.",
            }),
          },
        },
      ],
    });

    const res = await POST(makeRequest({ description: "Movie tickets" }));
    const body = await res.json();
    expect(body.suggestion).toBeNull();
  });

  it("returns null when AI returns an invalid confidence value", async () => {
    mockGetSession.mockResolvedValue(SESSION);
    mockDbSelect.mockReturnValueOnce(
      chain([{ id: "cat-1", name: "Groceries" }]),
    );

    mockCreate.mockResolvedValue({
      choices: [
        {
          message: {
            content: JSON.stringify({
              category: "Groceries",
              confidence: "very_high",
              reason: "Obvious match.",
            }),
          },
        },
      ],
    });

    const res = await POST(makeRequest({ description: "Groceries" }));
    const body = await res.json();
    expect(body.suggestion).toBeNull();
  });

  it("returns null gracefully when OpenAI throws", async () => {
    mockGetSession.mockResolvedValue(SESSION);
    mockDbSelect.mockReturnValueOnce(
      chain([{ id: "cat-1", name: "Groceries" }]),
    );
    mockCreate.mockRejectedValue(new Error("Rate limit"));

    const res = await POST(makeRequest({ description: "Grocery run" }));
    const body = await res.json();
    expect(body.suggestion).toBeNull();
  });

  it("defaults type to 'expense' when not provided", async () => {
    mockGetSession.mockResolvedValue(SESSION);
    mockDbSelect.mockReturnValueOnce(chain([{ id: "cat-1", name: "Groceries" }]));
    mockCreate.mockResolvedValue({
      choices: [
        {
          message: {
            content: JSON.stringify({
              category: "Groceries",
              confidence: "high",
              reason: "Standard grocery purchase.",
            }),
          },
        },
      ],
    });

    // no `type` field in body — should default to "expense" per schema
    const res = await POST(makeRequest({ description: "Milk and eggs" }));
    const body = await res.json();
    expect(body.suggestion).not.toBeNull();
  });
});
