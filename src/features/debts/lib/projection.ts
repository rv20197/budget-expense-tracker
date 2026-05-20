import Decimal from "decimal.js";

export type InterestType = "NONE" | "SIMPLE" | "COMPOUND";

export type ProjectionResult = {
  months: number;
  projectedPayoffDate: string;
} | null;

/**
 * Calculates how many monthly installments remain before a debt is paid off.
 *
 * Interest models:
 *  NONE     – no interest; pure principal amortisation
 *  SIMPLE   – interest accrues on the ORIGINAL principal each period (flat charge)
 *  COMPOUND – interest accrues on the CURRENT balance each period (reducing-balance)
 *
 * Returns null when:
 *  - installmentAmount <= 0
 *  - the installment cannot keep up with the interest (infinite loop guard)
 *  - calculation exceeds 1200 months (100 years)
 */
export function calculatePayoffMonths(
  principal: Decimal,
  remainingBalance: Decimal,
  installmentAmount: Decimal,
  interestRate: Decimal,
  interestType: InterestType,
): number | null {
  if (installmentAmount.lte(0)) {
    return null;
  }

  let balance = remainingBalance;
  let months = 0;
  const monthlyRate =
    interestType === "NONE" ? new Decimal(0) : interestRate.div(100).div(12);

  // Pre-compute the fixed simple-interest charge once so the inner loop stays O(1).
  const simpleInterestPerMonth = principal.mul(monthlyRate);

  while (balance.gt(0) && months < 1200) {
    if (interestType === "SIMPLE") {
      balance = balance.plus(simpleInterestPerMonth);
    } else if (interestType === "COMPOUND") {
      balance = balance.plus(balance.mul(monthlyRate));
    }

    balance = balance.minus(installmentAmount);
    months += 1;

    if (balance.gt(0) && installmentAmount.lte(balance.mul(monthlyRate))) {
      return null;
    }
  }

  if (months === 0 || months >= 1200) {
    return null;
  }

  return months;
}
