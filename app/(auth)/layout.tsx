import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
    googleBot: {
      index: false,
      follow: false,
    },
  },
};

type AuthLayoutProps = {
  children: ReactNode;
};

export default function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="flex justify-center items-center min-h-screen">
      <div className="w-full max-w-sm border border-border rounded-lg bg-card p-6 sm:p-8 shadow-sm">
        {children}
      </div>
    </div>
  );
}
