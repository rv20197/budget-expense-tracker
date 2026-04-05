import { z } from "zod";

const decimalString = z
  .string()
  .trim()
  .regex(/^\d+(\.\d{1,2})?$/, "Enter a valid amount with up to 2 decimals.");

const optionalDate = z
  .string()
  .trim()
  .optional()
  .transform((value) => value || undefined)
  .refine((value) => !value || !Number.isNaN(new Date(value).getTime()), {
    message: "Enter a valid date.",
  });

export const createDebtSchema = z.object({
  name: z.string().trim().min(1).max(100),
  direction: z.enum(["DEBT", "LOAN"]),
  counterparty: z.string().trim().min(1).max(100),
  principal: decimalString,
  interestRate: z
    .string()
    .trim()
    .regex(/^\d+(\.\d{1,2})?$/, "Enter a valid interest rate.")
    .refine((value) => Number(value) >= 0 && Number(value) <= 100, {
      message: "Interest rate must be between 0 and 100.",
    }),
  interestType: z.enum(["NONE", "SIMPLE", "COMPOUND"]),
  dueDate: optionalDate,
  nextPaymentDate: optionalDate,
  installmentAmount: decimalString.optional().or(z.literal("")),
  notes: z.string().trim().max(500).optional().or(z.literal("")),
});

export const updateDebtSchema = createDebtSchema.pick({
  name: true,
  counterparty: true,
  interestRate: true,
  interestType: true,
  dueDate: true,
  nextPaymentDate: true,
  installmentAmount: true,
  notes: true,
});

export const recordPaymentSchema = z.object({
  amount: decimalString,
  paidOn: z.string().date("Choose a valid payment date.").refine(
    (value) => new Date(value) <= new Date(),
    "Payment date cannot be in the future.",
  ),
  note: z.string().trim().max(200).optional().or(z.literal("")),
});

export type CreateDebtInput = z.input<typeof createDebtSchema>;
export type UpdateDebtInput = z.input<typeof updateDebtSchema>;
export type RecordPaymentInput = z.input<typeof recordPaymentSchema>;
