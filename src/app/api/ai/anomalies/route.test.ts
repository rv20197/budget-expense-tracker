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

const { GET } = await import("./route");

// Each test uses a unique householdId so the module-level anomalyCache
// never serves a stale result from a previous test.
let testIndex = 0;
function makeSession() {
  testIndex++;
  return { user: { id: "user-1", householdId: `hh-${testIndex}`, email: "test@example.com" } };
}

/** Set up the 5 DB queries the anomalies route fires in parallel. */
function mockDbForAnomalies({
  currentTotals = [] as unknown[],
  baselineTotals = [] as unknown[],
  baselineAvgTx = [] as unknown[],
  topTransactions = [] as unknown[],
  budgetRows = [] as unknown[],
} = {}) {
  mockDbSelect
    .mockReturnValueOnce(chain(currentTotals))
    .mockReturnValueOnce(chain(baselineTotals))
    .mockReturnValueOnce(chain(baselineAvgTx))
    .mockReturnValueOnce(chain(topTransactions))
    .mockReturnValueOnce(chain(budgetRows));
}

describe("GET /api/ai/anomalies", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 with empty alerts when not authenticated", async () => {
    mockGetSession.mockResolvedValue(null);
    const req = new Request("http://localhost/api/ai/anomalies");
    const res = await GET(req);
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.alerts).toEqual([]);
  });

  it("returns empty alerts when AI finds nothing notable", async () => {
    mockGetSession.mockResolvedValue(makeSession());
    mockDbForAnomalies({
      currentTotals: [
        {
          categoryId: "cat-1",
          categoryName: "Groceries",
          total: "5000",
          txCount: 10,
        },
      ],
    });

    mockCreate.mockResolvedValue({
      choices: [{ message: { content: JSON.stringify({ alerts: [] }) } }],
    });

    const req = new Request("http://localhost/api/ai/anomalies");
    const res = await GET(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.alerts).toEqual([]);
    expect(body.cached).toBe(false);
  });

  it("returns valid alerts on happy path", async () => {
    mockGetSession.mockResolvedValue(makeSession());
    mockDbForAnomalies({
      currentTotals: [
        {
          categoryId: "cat-1",
          categoryName: "Groceries",
          total: "8000",
          txCount: 15,
        },
      ],
      baselineTotals: [
        { categoryId: "cat-1", monthStr: "2025-03", total: "4000" },
        { categoryId: "cat-1", monthStr: "2025-04", total: "4200" },
      ],
    });

    mockCreate.mockResolvedValue({
      choices: [
        {
          message: {
            content: JSON.stringify({
              alerts: [
                {
                  type: "overspend",
                  category: "Groceries",
                  message: "Groceries spend is 90% above the 2-month average.",
                  severity: "critical",
                },
              ],
            }),
          },
        },
      ],
    });

    const req = new Request("http://localhost/api/ai/anomalies");
    const res = await GET(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.alerts).toHaveLength(1);
    expect(body.alerts[0]).toMatchObject({
      type: "overspend",
      category: "Groceries",
      severity: "critical",
    });
  });

  it("filters out alerts whose category is not in current spending data", async () => {
    mockGetSession.mockResolvedValue(makeSession());
    mockDbForAnomalies({
      currentTotals: [
        {
          categoryId: "cat-1",
          categoryName: "Groceries",
          total: "5000",
          txCount: 10,
        },
      ],
    });

    mockCreate.mockResolvedValue({
      choices: [
        {
          message: {
            content: JSON.stringify({
              alerts: [
                {
                  type: "overspend",
                  category: "Entertainment", // not in currentTotals
                  message: "Entertainment spending is high.",
                  severity: "warning",
                },
              ],
            }),
          },
        },
      ],
    });

    const req = new Request("http://localhost/api/ai/anomalies");
    const res = await GET(req);
    const body = await res.json();
    expect(body.alerts).toHaveLength(0);
  });

  it("filters out alerts with invalid type or severity values", async () => {
    mockGetSession.mockResolvedValue(makeSession());
    mockDbForAnomalies({
      currentTotals: [
        {
          categoryId: "cat-1",
          categoryName: "Groceries",
          total: "5000",
          txCount: 10,
        },
      ],
    });

    mockCreate.mockResolvedValue({
      choices: [
        {
          message: {
            content: JSON.stringify({
              alerts: [
                {
                  type: "spending_spike", // invalid type
                  category: "Groceries",
                  message: "Spike detected.",
                  severity: "warning",
                },
                {
                  type: "overspend",
                  category: "Groceries",
                  message: "Valid alert.",
                  severity: "extreme", // invalid severity
                },
              ],
            }),
          },
        },
      ],
    });

    const req = new Request("http://localhost/api/ai/anomalies");
    const res = await GET(req);
    const body = await res.json();
    expect(body.alerts).toHaveLength(0);
  });

  it("returns empty alerts gracefully when OpenAI throws", async () => {
    mockGetSession.mockResolvedValue(makeSession());
    mockDbForAnomalies({
      currentTotals: [
        {
          categoryId: "cat-1",
          categoryName: "Groceries",
          total: "5000",
          txCount: 5,
        },
      ],
    });
    mockCreate.mockRejectedValue(new Error("Service unavailable"));

    const req = new Request("http://localhost/api/ai/anomalies");
    const res = await GET(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.alerts).toEqual([]);
  });
});
