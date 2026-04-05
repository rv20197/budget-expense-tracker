export const DEFAULT_CATEGORIES = [
  { name: "Food", type: "expense", color: "#f97316" },
  { name: "Transport", type: "expense", color: "#0ea5e9" },
  { name: "Housing", type: "expense", color: "#8b5cf6" },
  { name: "Healthcare", type: "expense", color: "#ef4444" },
  { name: "Entertainment", type: "expense", color: "#ec4899" },
  { name: "Salary", type: "income", color: "#22c55e" },
  { name: "Freelance", type: "income", color: "#14b8a6" },
] as const;

export const DASHBOARD_NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/transactions", label: "Transactions" },
  { href: "/categories", label: "Categories" },
  { href: "/budgets", label: "Budgets" },
  { href: "/recurring", label: "Recurring" },
  { href: "/debt", label: "Debt" },
  { href: "/reports", label: "Reports" },
  { href: "/settings", label: "Settings" },
] as const;
