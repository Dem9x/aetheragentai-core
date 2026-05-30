import { NextResponse } from "next/server";
import { apiError } from "@/lib/api/response";

export function getAetherApiBaseUrl() {
  return (process.env.AETHER_API_BASE_URL || process.env.NEXT_PUBLIC_AETHER_API_BASE_URL || "http://localhost:4000").replace(/\/$/, "");
}

export function apiBackendConfigured() {
  return Boolean(process.env.AETHER_API_BASE_URL || process.env.NEXT_PUBLIC_AETHER_API_BASE_URL);
}

function forwardedHeaders(request: Request, extra?: HeadersInit) {
  const headers = new Headers(extra);
  const allowed = [
    "content-type",
    "x-agent-id",
    "x-runner-timestamp",
    "x-runner-nonce",
    "x-runner-signature",
    "x-runner-secret",
    "x-dev-wallet-address",
    "x-dev-validator-address",
    "x-dev-finalizer-address"
  ];

  for (const key of allowed) {
    const value = request.headers.get(key);
    if (value && !headers.has(key)) headers.set(key, value);
  }
  return headers;
}

export async function proxyToAetherApi(request: Request, path: string, init: RequestInit = {}) {
  const target = `${getAetherApiBaseUrl()}${path.startsWith("/") ? path : `/${path}`}`;
  const method = init.method ?? request.method;
  const body = init.body ?? (method === "GET" || method === "HEAD" ? undefined : await request.text());
  const response = await fetch(target, {
    ...init,
    method,
    body,
    headers: forwardedHeaders(request, init.headers),
    cache: "no-store"
  });
  const text = await response.text();
  const contentType = response.headers.get("content-type") || "application/json";
  return new NextResponse(text, {
    status: response.status,
    headers: { "content-type": contentType }
  });
}

export function apiBackendUnavailable(error: unknown) {
  return apiError(
    "AETHER_API_UNAVAILABLE",
    error instanceof Error ? error.message : "Aether API server is unavailable. Start it with npm run api:dev and set AETHER_API_BASE_URL.",
    503
  );
}
