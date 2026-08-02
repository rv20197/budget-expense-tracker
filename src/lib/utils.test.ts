import { describe, expect, it } from "vitest";
import { endOfMonth, formatCompactCurrency, formatCurrency, formatCurrencyDetailed, formatMonthYear, startOfMonth } from "./utils";

describe("Date utilities", () => {
  it("returns the first day of the month as UTC Date", () => {
    const start = startOfMonth(8, 2026);
    expect(start.toISOString().slice(0, 10)).toBe("2026-08-01");
  });

  it("returns the last day of the month as UTC Date", () => {
    const end = endOfMonth(8, 2026);
    expect(end.toISOString().slice(0, 10)).toBe("2026-08-31");
  });

  it("returns the first day of February in a leap year", () => {
    const start = startOfMonth(2, 2024);
    const end = endOfMonth(2, 2024);
    expect(start.toISOString().slice(0, 10)).toBe("2024-02-01");
    expect(end.toISOString().slice(0, 10)).toBe("2024-02-29");
  });

  it("formats month and year correctly", () => {
    expect(formatMonthYear(8, 2026)).toBe("August 2026");
    expect(formatMonthYear(1, 2026)).toBe("January 2026");
    expect(formatMonthYear(12, 2026)).toBe("December 2026");
  });
});

describe("formatCurrency", () => {
  it("always formats with currency symbol for AED", () => {
    expect(formatCurrency(241815, "AED")).toBe("د.إ 241,815.00");
  });

  it("always formats with currency symbol for USD", () => {
    expect(formatCurrency(241815, "USD")).toBe("$241,815.00");
  });

  it("always formats with currency symbol and Indian system for INR", () => {
    expect(formatCurrency(241815, "INR")).toBe("₹2,41,815.00");
  });

  it("always formats with currency symbol for EUR", () => {
    expect(formatCurrency(241815, "EUR")).toBe("€241,815.00");
  });

  it("always formats with currency symbol for JPY without decimals", () => {
    expect(formatCurrency(241815, "JPY")).toBe("¥241,815");
  });
});

describe("formatCurrencyDetailed", () => {
  it("formats with code - symbol amount for AED", () => {
    expect(formatCurrencyDetailed(241815, "AED")).toBe("AED - د.إ 241,815.00");
  });

  it("formats with code - symbol amount for USD", () => {
    expect(formatCurrencyDetailed(241815, "USD")).toBe("USD - $241,815.00");
  });

  it("formats with code - symbol amount for INR", () => {
    expect(formatCurrencyDetailed(241815, "INR")).toBe("INR - ₹2,41,815.00");
  });
});

describe("formatCompactCurrency", () => {
  it("formats zero with symbol", () => {
    expect(formatCompactCurrency(0, "INR")).toBe("₹0");
    expect(formatCompactCurrency(0, "USD")).toBe("$0");
  });

  it("formats compact values for USD", () => {
    expect(formatCompactCurrency(15000, "USD")).toBe("$15K");
    expect(formatCompactCurrency(1000000, "USD")).toBe("$1M");
  });

  it("formats compact values for INR", () => {
    expect(formatCompactCurrency(1000, "INR")).toBe("₹1K");
  });
});
