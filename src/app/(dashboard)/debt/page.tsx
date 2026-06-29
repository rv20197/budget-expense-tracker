import { DebtPageClient } from "@/features/debts/components/debt-page-client";
import {
  getDebtSummary,
  getDebts,
  getPayoffProjection,
} from "@/features/debts/actions/debt.actions";
import { getSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";

export default async function DebtPage() {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  if (!session.user.householdId) {
    redirect("/onboarding");
  }

  const data = await getDebts();
  const summary = await getDebtSummary(session.user.householdId);
  const allItems = [...data.debts, ...data.loans];
  const projectionEntries = await Promise.all(
    allItems.map(async (item) => [item.id, await getPayoffProjection(item.id)] as const),
  );

  return (
    <DebtPageClient
      debts={data.debts}
      loans={data.loans}
      summary={summary}
      projections={Object.fromEntries(projectionEntries)}
    />
  );
}
