"use client";

import { Authenticated } from "convex/react";
import type { ReactNode } from "react";

export function MainAuthenticated({ children }: { children: ReactNode }) {
  return (
    <Authenticated>
      <div className="w-full flex justify-center min-h-screen">
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {children}
        </div>
      </div>
    </Authenticated>
  );
}
