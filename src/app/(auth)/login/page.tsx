import { connection } from "next/server";
import { redirect } from "next/navigation";

import { LoginForm } from "@/features/auth/components/login-form";
import { getSession } from "@/lib/auth/session";

export default async function LoginPage() {
  await connection();
  const session = await getSession();

  if (session) {
    redirect("/dashboard");
  }

  return <LoginForm />;
}
