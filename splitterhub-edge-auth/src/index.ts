import { jwtVerify } from "jose";

export default {
  async fetch(request: Request, env: any): Promise<Response> {
    const url = new URL(request.url);
    const ip = request.headers.get("cf-connecting-ip") || "unknown";

    // -------------------------
    // 🍪 Safe cookie parsing
    // -------------------------
    const cookieHeader = request.headers.get("cookie") || "";

    const token = cookieHeader
      .split(";")
      .map(c => c.trim())
      .find(c => c.startsWith("auth-token="))
      ?.split("=")[1];

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

    const path = url.pathname.toLowerCase();

    const isSuspicious = suspiciousPatterns.some(pattern =>
      path.includes(pattern)
    );

    if (isSuspicious) {
      console.log(`🚨 Blocked suspicious request from ${ip}: ${path}`);
      return new Response("Blocked", { status: 403 });
    }

    // -------------------------
    // 🔐 Auth protection
    // -------------------------
    const isDashboard =
      path === "/dashboard" || path.startsWith("/dashboard/");

    if (isDashboard) {
      if (!token) {
        return Response.redirect(new URL("/sign-in", request.url).toString());
      }

      try {
        const secret = new TextEncoder().encode(env.JWT_SECRET);

        const { payload } = await jwtVerify(token, secret);

        // ✅ Attach user info to request (optional but powerful)
        request.headers.set("x-user-id", payload.userId as string);
      } catch (err) {
        console.log(`❌ Invalid token from ${ip}`);
        return Response.redirect(new URL("/sign-in", request.url).toString());
      }
    }

    // -------------------------
    // 🚀 Forward to VPS
    // -------------------------
    return fetch(request);
  },
};