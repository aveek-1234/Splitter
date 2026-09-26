"use client";

import { useAuth } from "@clerk/nextjs";
import { useCallback, useEffect, useState } from "react";

async function parseJson(response: Response) {
  const text = await response.text();
  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

export function useFetchQuery<T>(path: string | null): {
  data: T | undefined;
  loading: boolean;
  error: string;
  refetch: () => void;
} {
  const { getToken, isLoaded, isSignedIn } = useAuth();
  const [data, setData] = useState<T | undefined>(undefined);
  const [loading, setLoading] = useState(Boolean(path));
  const [error, setError] = useState("");
  const [tick, setTick] = useState(0);

  const refetch = useCallback(() => setTick((value) => value + 1), []);

  useEffect(() => {
    if (!path || !isLoaded || !isSignedIn) {
      setLoading(Boolean(path) && (!isLoaded || !isSignedIn));
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError("");

    (async () => {
      try {
        const token = await getToken({ template: "convex" });
        const response = await fetch(path, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        const payload = await parseJson(response);
        if (!response.ok) {
          throw new Error(payload?.error ?? "Request failed");
        }
        if (!cancelled) {
          setData(payload as T);
        }
      } catch (err) {
        if (!cancelled) {
          setError((err as Error).message ?? "Request failed");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [path, isLoaded, isSignedIn, getToken, tick]);

  return { data, loading, error, refetch };
}

export function useMutateQuery<TResult = unknown>() {
  const { getToken } = useAuth();
  const [data, setData] = useState<TResult | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mutate = async (
    path: string,
    options?: { method?: string; body?: unknown },
  ): Promise<TResult | undefined> => {
    try {
      setLoading(true);
      setError(null);
      const token = await getToken({ template: "convex" });
      const response = await fetch(path, {
        method: options?.method ?? "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: options?.body === undefined ? undefined : JSON.stringify(options.body),
      });
      const payload = await parseJson(response);
      if (!response.ok) {
        throw new Error(payload?.error ?? "Request failed");
      }
      setData(payload as TResult);
      return payload as TResult;
    } catch (err) {
      setError((err as Error).message ?? "An error occurred");
      return undefined;
    } finally {
      setLoading(false);
    }
  };

  return { data, loading, error, mutate };
}
