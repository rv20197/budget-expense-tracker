import { connection } from "next/server";
import { redirect } from "next/navigation";

import { getSession } from "@/lib/auth/session";
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

  return (
    <DashboardLayoutClient userName={session.user.name}>
      {children}
    </DashboardLayoutClient>
  );
}
