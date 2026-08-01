import { addMonthsClamped } from "@/lib/utils";

export type DebtDatesInput = {
  dueDate: Date | null;
  nextPaymentDate: Date | null;
};

export type DebtDatesOutput = {
  dueDate: Date | null;
  nextPaymentDate: Date | null;
};

/**
 * Calculates updated due date and next payment date when a payment is recorded.
 * If the debt is fully paid off, both dates become null.
 * Otherwise, non-null dates are advanced by 1 month.
 */
export function calculateNextPaymentDates(
  debt: DebtDatesInput,
  isFullyPaid: boolean,
): DebtDatesOutput {
  if (isFullyPaid) {
    return { dueDate: null, nextPaymentDate: null };
  }

  return {
    dueDate: debt.dueDate ? addMonthsClamped(debt.dueDate, 1) : null,
    nextPaymentDate: debt.nextPaymentDate
      ? addMonthsClamped(debt.nextPaymentDate, 1)
      : null,
  };
}
