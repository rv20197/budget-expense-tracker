import { connection } from "next/server";
import { redirect } from "next/navigation";

import { getSession } from "@/lib/auth/session";

export default async function HomePage() {
  await connection();
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  redirect(session.user.householdId ? "/dashboard" : "/onboarding");
}
