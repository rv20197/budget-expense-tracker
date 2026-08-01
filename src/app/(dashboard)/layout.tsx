import { connection } from "next/server";
import { redirect } from "next/navigation";

import { getSession } from "@/lib/auth/session";
import { CurrencyProvider } from "@/lib/currencyContext";
import { DashboardLayoutClient } from "./layout-client";

type DashboardLayoutProps = Readonly<{
  children: React.ReactNode;
}>;

export default async function DashboardLayout({
  children,
}: DashboardLayoutProps) {
  await connection();
  const session = await getSession();
  
  if (!session) {
    redirect("/login");
  }

  if (!session.user.householdId) {
    redirect("/onboarding");
  }

  return (
    <CurrencyProvider initialCurrency={session.user.currency}>
      <DashboardLayoutClient userName={session.user.name} email={session.user.email}>
        {children}
      </DashboardLayoutClient>
    </CurrencyProvider>
  );
}
