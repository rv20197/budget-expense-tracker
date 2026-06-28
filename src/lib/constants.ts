export const DEFAULT_CATEGORIES = [
  { name: "Groceries", type: "expense", color: "#4ade80" },
  { name: "Shopping",  type: "expense", color: "#60a5fa" },
  { name: "Fastfood",  type: "expense", color: "#fb923c" },
  { name: "E-Apps",    type: "expense", color: "#a78bfa" },
  { name: "Mobile",    type: "expense", color: "#22d3ee" },
  { name: "Food",      type: "expense", color: "#fbbf24" },
  { name: "Others",    type: "expense", color: "#94a3b8" },
  { name: "Salary",    type: "income",  color: "#22c55e" },
  { name: "Freelance", type: "income",  color: "#14b8a6" },
] as const;

export const DASHBOARD_NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/transactions", label: "Transactions" },
  { href: "/categories", label: "Categories" },
  { href: "/budgets", label: "Budgets" },
  { href: "/recurring", label: "Recurring" },
  { href: "/debt", label: "Debt" },
  { href: "/reports", label: "Reports" },
  { href: "/statements", label: "Statements" },
  { href: "/settings", label: "Settings" },
] as const;
