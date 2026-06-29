import { z } from "zod";

const moneyString = z
  .string()
  .trim()
  .regex(/^\d+(\.\d{1,2})?$/, "Enter a valid amount with up to 2 decimals.");

export const categorySchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters."),
  type: z.enum(["income", "expense"]),
  color: z.string().trim().min(4, "Choose a color."),
});

export const transactionSchema = z.object({
  id: z.string().uuid().optional(),
  categoryId: z.string().uuid("Choose a category."),
  type: z.enum(["income", "expense"]),
  description: z
    .string()
    .trim()
    .min(2, "Description must be at least 2 characters."),
  amount: moneyString,
  transactionDate: z.string().date("Choose a valid date."),
  notes: z.string().trim().max(500).optional().or(z.literal("")),
});


export const deleteAccountSchema = z.object({
  confirmation: z.literal("DELETE", {
    error: "Type DELETE to confirm account deletion.",
  }),
});

export type CategoryInput = z.infer<typeof categorySchema>;
export type TransactionInput = z.infer<typeof transactionSchema>;
export type DeleteAccountInput = z.infer<typeof deleteAccountSchema>;
