import type { Metadata } from "next";
import { Suspense } from "react";
import "./globals.css";
import { Providers } from "@/components/providers";
import ThemeRegistry from "@/components/ThemeRegistry";

export const metadata: Metadata = {
  title: "Budget Expense Tracker",
  description: "Track budgets, categories, transactions, and reports.",
};

type RootLayoutProps = Readonly<{
  children: React.ReactNode;
}>;

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en">
      <body className="min-h-screen flex flex-col bg-slate-100">
        <ThemeRegistry>
          <Suspense fallback={null}>{children}</Suspense>
        </ThemeRegistry>
        <Providers />
      </body>
    </html>
  );
}
