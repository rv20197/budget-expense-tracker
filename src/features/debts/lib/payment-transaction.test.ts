import { describe, expect, it, vi } from "vitest";

vi.mock("@/db", () => ({
  db: {
    transaction: vi.fn(),
  },
}));

import { getOrCreateDebtCategory } from "./payment-transaction";

describe("getOrCreateDebtCategory", () => {
  it("uses existing Debt Payment category if present", async () => {
    const mockTx = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([
            { id: "cat-1", name: "Debt Payment", type: "expense" },
            { id: "cat-2", name: "Others", type: "expense" },
          ]),
        }),
      }),
      insert: vi.fn(),
    };

    const catId = await getOrCreateDebtCategory(
      mockTx as any,
      "house-1",
      "user-1",
      "expense",
    );

    expect(catId).toBe("cat-1");
    expect(mockTx.insert).not.toHaveBeenCalled();
  });

  it("falls back to Others category if specific debt category not found", async () => {
    const mockTx = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([
            { id: "cat-groceries", name: "Groceries", type: "expense" },
            { id: "cat-others", name: "Others", type: "expense" },
          ]),
        }),
      }),
      insert: vi.fn(),
    };

    const catId = await getOrCreateDebtCategory(
      mockTx as any,
      "house-1",
      "user-1",
      "expense",
    );

    expect(catId).toBe("cat-others");
  });

  it("creates new category if no suitable existing category is found", async () => {
    const mockTx = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([]),
        }),
      }),
      insert: vi.fn().mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([{ id: "cat-new" }]),
        }),
      }),
    };

    const catId = await getOrCreateDebtCategory(
      mockTx as any,
      "house-1",
      "user-1",
      "expense",
    );

    expect(catId).toBe("cat-new");
    expect(mockTx.insert).toHaveBeenCalled();
  });
});
