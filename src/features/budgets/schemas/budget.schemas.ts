// Re-exports the budget schema from the shared finance schemas module.
// TODO: Move budgetSchema definition here (out of the transactions feature)
// once a shared schemas location or the budgets feature is the clear owner.
export { budgetSchema, type BudgetInput } from "@/features/transactions/schemas/finance.schemas";
