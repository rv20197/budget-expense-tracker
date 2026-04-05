"use client";

import Button from "@mui/material/Button";

type DashboardErrorProps = Readonly<{
  error: Error;
  reset: () => void;
}>;

export default function DashboardError({ error, reset }: DashboardErrorProps) {
  return (
    <div className="rounded-[28px] border border-red-200 bg-red-50 p-8 text-red-800">
      <h2 className="text-xl font-semibold">Something went wrong</h2>
      <p className="mt-2 text-sm">{error.message}</p>
      <Button className="mt-4" variant="contained" onClick={reset}>
        Try again
      </Button>
    </div>
  );
}
