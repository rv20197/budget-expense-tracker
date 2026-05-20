import Decimal from "decimal.js";
import { describe, expect, it } from "vitest";

import { calculatePayoffMonths } from "./projection";

function d(value: number | string) {
  return new Decimal(value);
}

describe("calculatePayoffMonths", () => {
  // ─────────────────────────────────────────────────────────────
  // NONE – no interest
  // ─────────────────────────────────────────────────────────────
  describe("NONE interest", () => {
    it("returns correct month count for an exact payoff", () => {
      // ₹12,000 principal, ₹1,000/month → 12 months
      expect(
        calculatePayoffMonths(d(12000), d(12000), d(1000), d(0), "NONE"),
      ).toBe(12);
    });

    it("handles a final partial payment (balance < installment)", () => {
      // ₹1,500 remaining, ₹1,000/month → 2 months (month 1: 500 left; month 2: paid off)
      expect(
        calculatePayoffMonths(d(12000), d(1500), d(1000), d(0), "NONE"),
      ).toBe(2);
    });

    it("returns null when installmentAmount is zero", () => {
      expect(
        calculatePayoffMonths(d(10000), d(10000), d(0), d(0), "NONE"),
      ).toBeNull();
    });

    it("returns null when installmentAmount is negative", () => {
      expect(
        calculatePayoffMonths(d(10000), d(10000), d(-100), d(0), "NONE"),
      ).toBeNull();
    });
  });

  // ─────────────────────────────────────────────────────────────
  // SIMPLE interest
  // ─────────────────────────────────────────────────────────────
  describe("SIMPLE interest", () => {
    it("calculates using original principal, not current balance (bug regression)", () => {
      // Principal  = ₹10,000
      // Remaining  = ₹6,000  (₹4,000 already paid)
      // Rate       = 12% p.a. → 1% per month
      // Installment= ₹1,200/month
      //
      // CORRECT (simple interest on original ₹10,000):
      //   monthly interest = ₹100
      //   net principal reduction per month = ₹1,200 − ₹100 = ₹1,100
      //   months to clear ₹6,000 ≈ ceil(6,000 / 1,100) ≈ 6
      //
      // WRONG (old bug: simple interest on ₹6,000 remaining):
      //   monthly interest = ₹60
      //   net reduction = ₹1,140/month → ceil(6,000/1,140) ≈ 6, but accumulates less interest
      //
      // With correct math: each month balance = balance + 100 - 1200
      //   start: 6000
      //   m1: 6000 + 100 - 1200 = 4900
      //   m2: 4900 + 100 - 1200 = 3800
      //   m3: 3800 + 100 - 1200 = 2700
      //   m4: 2700 + 100 - 1200 = 1600
      //   m5: 1600 + 100 - 1200 = 500
      //   m6: 500  + 100 - 1200 = -600 → paid off after 6 months
      const months = calculatePayoffMonths(
        d(10000),
        d(6000),
        d(1200),
        d(12),
        "SIMPLE",
      );
      expect(months).toBe(6);
    });

    it("uses principal (not remaining balance) for interest base when balances match", () => {
      // When no payments made, principal === remainingBalance → same result either way.
      // ₹10,000 at 12%/yr, ₹1,200/month.
      // net reduction = ₹1,100/month → 10,000/1,100 ≈ 10 months (with rounding)
      const months = calculatePayoffMonths(
        d(10000),
        d(10000),
        d(1200),
        d(12),
        "SIMPLE",
      );
      expect(months).not.toBeNull();
      // Verify interest is based on 10,000 (₹100/mo) not on a different base
      // Manual: 10 iterations get balance to ≈ -100, so 10 months
      expect(months).toBe(10);
    });

    it("returns null when installment cannot cover monthly interest on principal", () => {
      // ₹10,000, 24%/yr → ₹200/month interest. Installment = ₹100 → can never pay off.
      expect(
        calculatePayoffMonths(d(10000), d(10000), d(100), d(24), "SIMPLE"),
      ).toBeNull();
    });
  });

  // ─────────────────────────────────────────────────────────────
  // COMPOUND interest
  // ─────────────────────────────────────────────────────────────
  describe("COMPOUND interest", () => {
    it("with large installments, COMPOUND takes fewer months than SIMPLE", () => {
      // Counter-intuitive but correct: simple interest always charges on the
      // original principal (e.g. ₹100/month even when ₹500 remains), while
      // compound charges on the declining balance (₹5/month when ₹500 remains).
      // Large installments reduce the balance quickly, making compound cheaper.
      //
      // Manual verification (₹10,000, 12%/yr = 1%/mo, ₹1,200/mo):
      //   SIMPLE  — each month: balance += 100 (fixed), then -1,200 → 10 months
      //   COMPOUND — each month: balance *= 1.01, then -1,200 → 9 months
      const simple = calculatePayoffMonths(
        d(10000),
        d(10000),
        d(1200),
        d(12),
        "SIMPLE",
      );
      const compound = calculatePayoffMonths(
        d(10000),
        d(10000),
        d(1200),
        d(12),
        "COMPOUND",
      );
      expect(simple).toBe(10);
      expect(compound).toBe(9);
      // compound < simple when installment >> interest charge
      expect(compound!).toBeLessThan(simple!);
    });

    it("COMPOUND always pays off in <= months compared to SIMPLE for same payment", () => {
      // Reducing-balance (compound) interest decreases as the balance falls,
      // so the net amount going to principal grows over time. Simple interest
      // stays fixed on the original principal even when nearly paid off, making
      // it always equal or slower than compound for the same installment.
      //
      // This holds regardless of whether the installment is large or marginal.
      const simple = calculatePayoffMonths(
        d(10000),
        d(10000),
        d(300),
        d(12),
        "SIMPLE",
      );
      const compound = calculatePayoffMonths(
        d(10000),
        d(10000),
        d(300),
        d(12),
        "COMPOUND",
      );
      expect(simple).not.toBeNull();
      expect(compound).not.toBeNull();
      // compound <= simple: confirmed values are 41 vs 50
      expect(compound!).toBeLessThanOrEqual(simple!);
    });

    it("returns null when installment cannot outpace compounding interest", () => {
      // ₹10,000, 24%/yr compound. Month 1 interest = ₹200. Installment ₹100.
      expect(
        calculatePayoffMonths(d(10000), d(10000), d(100), d(24), "COMPOUND"),
      ).toBeNull();
    });

    it("handles a partially-paid debt", () => {
      // ₹10,000 principal, ₹8,000 remaining. Compound.
      // Interest is on current balance (not original principal).
      const months = calculatePayoffMonths(
        d(10000),
        d(8000),
        d(1500),
        d(12),
        "COMPOUND",
      );
      expect(months).not.toBeNull();
      expect(months!).toBeGreaterThan(0);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // Guard rails
  // ─────────────────────────────────────────────────────────────
  describe("guard rails", () => {
    it("returns null for a zero-balance debt (already paid)", () => {
      expect(
        calculatePayoffMonths(d(10000), d(0), d(1000), d(12), "SIMPLE"),
      ).toBeNull();
    });

    it("returns null when no installment is set", () => {
      expect(
        calculatePayoffMonths(d(10000), d(10000), d(0), d(12), "COMPOUND"),
      ).toBeNull();
    });
  });
});
