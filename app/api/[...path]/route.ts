import { NextRequest } from "next/server";

const API_BASE = (process.env.DOTNET_API_URL ?? "http://localhost:5080").replace(
  /\/$/,
  "",
);

async function proxy(request: NextRequest, path: string[]) {
  const target = `${API_BASE}/api/${path.join("/")}${request.nextUrl.search}`;
  const headers = new Headers();
  const authorization = request.headers.get("authorization");
  const contentType = request.headers.get("content-type");
  if (authorization) {
    headers.set("authorization", authorization);
  }
  if (contentType) {
    headers.set("content-type", contentType);
  }

  const method = request.method;
  const body =
    method === "GET" || method === "HEAD" ? undefined : await request.arrayBuffer();

  const response = await fetch(target, {
    method,
    headers,
    body,
  });

  const responseHeaders = new Headers();
  const responseType = response.headers.get("content-type");
  if (responseType) {
    responseHeaders.set("content-type", responseType);
  }

  return new Response(response.body, {
    status: response.status,
    headers: responseHeaders,
  });
}

type RouteContext = { params: Promise<{ path: string[] }> };

export async function GET(request: NextRequest, context: RouteContext) {
  const { path } = await context.params;
  return proxy(request, path ?? []);
}

export async function POST(request: NextRequest, context: RouteContext) {
  const { path } = await context.params;
  return proxy(request, path ?? []);
}

export async function PUT(request: NextRequest, context: RouteContext) {
  const { path } = await context.params;
  return proxy(request, path ?? []);
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const { path } = await context.params;
  return proxy(request, path ?? []);
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  const { path } = await context.params;
  return proxy(request, path ?? []);
}
