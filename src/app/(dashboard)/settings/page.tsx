import { redirect } from "next/navigation";

import { SettingsPageClient } from "@/features/settings/components/settings-page-client";
import { getSession } from "@/lib/auth/session";

export default async function SettingsPage() {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  return <SettingsPageClient user={session.user} />;
}
