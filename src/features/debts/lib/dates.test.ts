import { describe, expect, it } from "vitest";
import { calculateNextPaymentDates } from "./dates";

describe("calculateNextPaymentDates", () => {
  it("returns null for both dates when debt is fully paid off", () => {
    const debt = {
      dueDate: new Date("2026-08-01"),
      nextPaymentDate: new Date("2026-08-15"),
    };
    const result = calculateNextPaymentDates(debt, true);
    expect(result.dueDate).toBeNull();
    expect(result.nextPaymentDate).toBeNull();
  });

  it("advances both dates by 1 month when debt remains active", () => {
    const debt = {
      dueDate: new Date("2026-08-01"),
      nextPaymentDate: new Date("2026-08-15"),
    };
    const result = calculateNextPaymentDates(debt, false);
    expect(result.dueDate?.toISOString().slice(0, 10)).toBe("2026-09-01");
    expect(result.nextPaymentDate?.toISOString().slice(0, 10)).toBe("2026-09-15");
  });

  it("advances dueDate and keeps nextPaymentDate null if nextPaymentDate is null", () => {
    const debt = {
      dueDate: new Date("2026-08-01"),
      nextPaymentDate: null,
    };
    const result = calculateNextPaymentDates(debt, false);
    expect(result.dueDate?.toISOString().slice(0, 10)).toBe("2026-09-01");
    expect(result.nextPaymentDate).toBeNull();
  });

  it("advances nextPaymentDate and keeps dueDate null if dueDate is null", () => {
    const debt = {
      dueDate: null,
      nextPaymentDate: new Date("2026-08-15"),
    };
    const result = calculateNextPaymentDates(debt, false);
    expect(result.dueDate).toBeNull();
    expect(result.nextPaymentDate?.toISOString().slice(0, 10)).toBe("2026-09-15");
  });

  it("handles month-end clamping (e.g., Jan 31 -> Feb 28)", () => {
    const debt = {
      dueDate: new Date("2026-01-31"),
      nextPaymentDate: new Date("2026-01-31"),
    };
    const result = calculateNextPaymentDates(debt, false);
    expect(result.dueDate?.toISOString().slice(0, 10)).toBe("2026-02-28");
    expect(result.nextPaymentDate?.toISOString().slice(0, 10)).toBe("2026-02-28");
  });
});
