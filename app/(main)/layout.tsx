import type { Metadata } from "next";
import { MainAuthenticated } from "./main-authenticated";
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

export default function MainLayout({ children }: { children: ReactNode }) {
  return <MainAuthenticated>{children}</MainAuthenticated>;
}
