export type Debt = {
  id: string;
  name: string;
  direction: "DEBT" | "LOAN";
  principal: string;
  remainingBalance: string;
  status: "ACTIVE" | "PAID" | "CANCELLED";
};

export type DebtPayment = {
  id: string;
  debtId: string;
  amount: string;
  paidOn: string;
  note: string | null;
};
