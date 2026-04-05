import Link from "next/link";

export default function NotFound() {
  return (
    <main className="grid min-h-screen place-items-center bg-slate-100 p-6">
      <div className="rounded-[32px] bg-white p-10 text-center shadow-xl shadow-slate-200">
        <p className="text-sm uppercase tracking-[0.3em] text-slate-500">404</p>
        <h1 className="mt-4 text-3xl font-semibold text-slate-950">
          Page not found
        </h1>
        <p className="mt-3 text-sm text-slate-600">
          The page you tried to open does not exist or has moved.
        </p>
        <Link
          href="/dashboard"
          className="mt-6 inline-flex rounded-2xl bg-slate-950 px-4 py-3 text-sm font-medium text-white"
        >
          Go to dashboard
        </Link>
      </div>
    </main>
  );
}
