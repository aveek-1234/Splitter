import { createRemoteJWKSet, jwtVerify } from "jose";

const JWKS = createRemoteJWKSet(
  new URL("https://clerk.splitterhub.cloud/.well-known/jwks.json")
);

export default {
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname.toLowerCase();
    const ip = request.headers.get("cf-connecting-ip") || "unknown";

    // -------------------------
    // 🚨 Bot / attack detection
    // -------------------------
    const suspiciousPatterns = [
      "/wp-admin",
      "/wp-login",
      "/xmlrpc.php",
      ".env",
      ".git",
      "setup-config.php",
    ];

    if (suspiciousPatterns.some(p => path.includes(p))) {
      console.log(`🚨 Blocked suspicious request from ${ip}: ${path}`);
      return new Response("Blocked", { status: 403 });
    }

    // -------------------------
    // 🍪 Extract Clerk session
    // -------------------------
    const cookieHeader = request.headers.get("cookie") || "";

    const token = cookieHeader
      .split(";")
      .map(c => c.trim())
      .find(c => c.startsWith("__session="))
      ?.split("=")[1];

    // -------------------------
    // 🌍 Public routes
    // -------------------------
    const publicRoutes = [
      "/",
      "/sign-in",
      "/sign-up",
    ];

    const isPublic = publicRoutes.some(route =>
      path === route || path.startsWith(route + "/")
    );

    // -------------------------
    // 🔐 Protect everything else
    // -------------------------
    if (!isPublic) {
      if (!token) {
        return Response.redirect(
          new URL("/sign-in", request.url).toString()
        );
      }

      try {
        const { payload } = await jwtVerify(token, JWKS, {
          issuer: "https://clerk.splitterhub.cloud",
        });

        // ✅ Properly clone request with new headers
        const newHeaders = new Headers(request.headers);
        newHeaders.set("x-user-id", payload.sub as string);

        const newRequest = new Request(request, {
          headers: newHeaders,
        });

        return fetch(newRequest);
      } catch (err) {
        console.log(`❌ Invalid session from ${ip}`);
        return Response.redirect(
          new URL("/sign-in", request.url).toString()
        );
      }
    }

    // -------------------------
    // 🚀 Public → pass through
    // -------------------------
    return fetch(request);
  },
};