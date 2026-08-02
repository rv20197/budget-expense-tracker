import type { Metadata } from "next";
import { Suspense } from "react";
import "./globals.css";
import { Providers } from "@/components/providers";
import ThemeRegistry from "@/components/ThemeRegistry";

export const metadata: Metadata = {
  title: "BudgetWise",
  description: "Track budgets, categories, transactions, and reports.",
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icon.png", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
  },
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
