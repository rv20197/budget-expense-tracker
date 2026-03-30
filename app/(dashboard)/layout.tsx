import { connection } from "next/server";
import { redirect } from "next/navigation";

import { Sidebar } from "@/components/dashboard/sidebar";
import { getSession } from "@/lib/auth/session";

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
    <div className="min-h-screen bg-slate-100">
      <div className="mx-auto grid min-h-screen max-w-[1600px] gap-4 p-4 lg:grid-cols-[280px_1fr]">
        <aside className="lg:sticky lg:top-4 lg:h-[calc(100vh-2rem)]">
          <Sidebar userName={session.user.name} />
        </aside>
        <div className="rounded-[32px] bg-white p-4 shadow-xl shadow-slate-200/80 ring-1 ring-slate-200 md:p-6">
          <header className="mb-8 flex flex-col gap-3 border-b border-slate-200 pb-6 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.3em] text-slate-500">
                Budget Tracker
              </p>
              <h1 className="mt-2 text-2xl font-semibold text-slate-950">
                Welcome back, {session.user.name}
              </h1>
            </div>
            <p className="text-sm text-slate-600">{session.user.email}</p>
          </header>
          {children}
        </div>
      </div>
    </div>
  );
}
