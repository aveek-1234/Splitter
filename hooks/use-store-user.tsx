"use client";

import { useAuth, useUser } from "@clerk/nextjs";
import { useEffect, useState } from "react";

export function useStoreUser() {
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const { user } = useUser();
  const [stored, setStored] = useState(false);

  useEffect(() => {
    if (!isLoaded || !isSignedIn) {
      setStored(false);
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const token = await getToken({ template: "convex" });
        const response = await fetch("/api/users/me", {
          method: "POST",
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (!cancelled) {
          setStored(response.ok);
        }
      } catch {
        if (!cancelled) {
          setStored(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isLoaded, isSignedIn, user?.id, getToken]);

  return {
    isLoading: !isLoaded || (isSignedIn && !stored),
    isAuthenticated: Boolean(isSignedIn && stored),
  };
}
