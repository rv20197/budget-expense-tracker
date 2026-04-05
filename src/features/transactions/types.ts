export type Transaction = {
  id: string;
  categoryId: string;
  description: string;
  amount: string;
  type: "income" | "expense";
  transactionDate: string;
  notes: string | null;
};
