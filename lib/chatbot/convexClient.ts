import { ConvexHttpClient } from "convex/browser";

export function createConvexClient(authToken?: string | null): ConvexHttpClient {
  const url = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!url) {
    throw new Error("Missing environment variable: NEXT_PUBLIC_CONVEX_URL");
  }

  const client = new ConvexHttpClient(url);
  if (authToken) {
    client.setAuth(authToken);
  }

  return client;
}
