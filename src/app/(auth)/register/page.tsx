import { connection } from "next/server";
import { redirect } from "next/navigation";

import { RegisterForm } from "@/features/auth/components/register-form";
import { getSession } from "@/lib/auth/session";

export default async function RegisterPage() {
  await connection();
  const session = await getSession();

  if (session) {
    redirect("/dashboard");
  }

  return <RegisterForm />;
}
