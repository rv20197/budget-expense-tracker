import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockGetSession, mockDbSelect, mockChat } = vi.hoisted(() => ({
  mockGetSession: vi.fn(),
  mockDbSelect: vi.fn(),
  mockChat: vi.fn(),
}));

vi.mock("@/lib/auth/session", () => ({ getSession: mockGetSession }));
vi.mock("@/db", () => ({ db: { select: mockDbSelect } }));
vi.mock("@/lib/ai/openai", () => ({ chat: mockChat }));

function chain(data: unknown[]) {
  const obj: Record<string, unknown> = {};
  for (const m of ["from", "where", "leftJoin", "innerJoin", "groupBy", "orderBy", "limit"]) {
    obj[m] = vi.fn().mockReturnValue(obj);
  }
  obj.then = (res: (v: unknown) => void, rej?: (e: unknown) => void) =>
    Promise.resolve(data).then(res, rej);
  return obj;
}

const { GET } = await import("./route");

const SESSION = {
  user: { id: "user-1", householdId: "hh-1", email: "test@example.com" },
};

/** Set up the 6 DB queries the insights route fires in parallel. */
function mockDbForInsights({
  income = "50000",
  expense = "30000",
  budget = "35000",
  categories = [{ name: "Groceries", total: "12000" }],
  topExpenses = [] as unknown[],
  dowRows = [] as unknown[],
} = {}) {
  mockDbSelect
    .mockReturnValueOnce(chain([{ total: income }]))
    .mockReturnValueOnce(chain([{ total: expense }]))
    .mockReturnValueOnce(chain([{ total: budget }]))
    .mockReturnValueOnce(chain(categories))
    .mockReturnValueOnce(chain(topExpenses))
    .mockReturnValueOnce(chain(dowRows));
}

describe("GET /api/ai/insights", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    mockGetSession.mockResolvedValue(null);
    const req = new Request("http://localhost/api/ai/insights?month=2025-05");
    const res = await GET(req);
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.insight).toBeNull();
  });

  it("returns an insight string on happy path", async () => {
    mockGetSession.mockResolvedValue(SESSION);
    mockDbForInsights();
    mockChat.mockResolvedValue("You spent ₹30,000 in May 2025.");

    const req = new Request("http://localhost/api/ai/insights?month=2025-05");
    const res = await GET(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.insight).toBe("You spent ₹30,000 in May 2025.");
    expect(body.cached).toBe(false);
  });

  it("uses current month when month param is missing", async () => {
    mockGetSession.mockResolvedValue(SESSION);
    mockDbForInsights();
    mockChat.mockResolvedValue("Some insight.");

    const req = new Request("http://localhost/api/ai/insights");
    const res = await GET(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.insight).toBe("Some insight.");
  });

  it("returns null insight when chat helper throws", async () => {
    mockGetSession.mockResolvedValue(SESSION);
    mockDbForInsights();
    mockChat.mockRejectedValue(new Error("OpenAI error"));

    const req = new Request("http://localhost/api/ai/insights?month=2025-04");
    const res = await GET(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.insight).toBeNull();
  });

  it("returns null insight when DB query throws", async () => {
    mockGetSession.mockResolvedValue(SESSION);
    // First DB call rejects
    mockDbSelect.mockReturnValueOnce({
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      then: (_: unknown, rej: (e: unknown) => void) =>
        Promise.reject(new Error("DB error")).then(undefined, rej),
    });

    const req = new Request("http://localhost/api/ai/insights?month=2025-03");
    const res = await GET(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.insight).toBeNull();
  });

  it("includes category breakdown in the prompt data (no AI error)", async () => {
    mockGetSession.mockResolvedValue(SESSION);
    mockDbForInsights({
      categories: [
        { name: "Groceries", total: "12000" },
        { name: "Utilities", total: "3000" },
      ],
    });
    mockChat.mockResolvedValue("Your top category was Groceries at ₹12,000.");

    const req = new Request("http://localhost/api/ai/insights?month=2025-06");
    const res = await GET(req);
    const body = await res.json();
    expect(body.insight).toContain("Groceries");
    // Verify chat was called with a user prompt mentioning Groceries
    const [, userPrompt] = mockChat.mock.calls[0] as [string, string];
    expect(userPrompt).toContain("Groceries");
  });
});
