import { connection } from "next/server";
import { redirect } from "next/navigation";

import { getSession } from "@/lib/auth/session";

export default async function HomePage() {
  await connection();
  const session = await getSession();

  redirect(session ? "/dashboard" : "/login");
}
