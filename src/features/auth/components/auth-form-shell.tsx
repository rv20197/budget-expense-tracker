type AuthFormShellProps = Readonly<{
  title: string;
  description: string;
  footer: React.ReactNode;
  children: React.ReactNode;
}>;

export function AuthFormShell({
  title,
  description,
  footer,
  children,
}: AuthFormShellProps) {
  return (
    <main className="grid min-h-screen bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.18),_transparent_40%),linear-gradient(180deg,#f8fafc_0%,#e2e8f0_100%)] px-4 py-10">
      <div className="m-auto grid w-full max-w-5xl gap-8 rounded-[32px] border border-white/60 bg-white/70 p-6 shadow-2xl shadow-slate-300/40 backdrop-blur md:grid-cols-[1.1fr_0.9fr] md:p-8">
        <section className="rounded-[28px] bg-slate-950 p-8 text-white">
          <p className="text-sm uppercase tracking-[0.35em] text-slate-300">
            Budget Tracker
          </p>
          <h1 className="mt-6 max-w-sm text-4xl font-semibold leading-tight">
            Make every rupee visible, intentional, and accountable.
          </h1>
          <p className="mt-4 max-w-md text-sm leading-7 text-slate-300">
            Secure JWT auth, budget controls, category planning, recurring
            automation, and reports built into one workflow.
          </p>
        </section>
        <section className="flex items-center">
          <div className="w-full rounded-[28px] bg-white p-6 ring-1 ring-slate-200 md:p-8">
            <h2 className="text-2xl font-semibold text-slate-950">{title}</h2>
            <p className="mt-2 text-sm text-slate-600">{description}</p>
            <div className="mt-8">{children}</div>
            <div className="mt-6 text-sm text-slate-600">{footer}</div>
          </div>
        </section>
      </div>
    </main>
  );
}
