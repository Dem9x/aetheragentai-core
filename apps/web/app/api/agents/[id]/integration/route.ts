import { apiError } from "@/lib/api/response";
import { apiBackendUnavailable, proxyToAetherApi } from "@/lib/server/aether-api";
import { getClientIp, rateLimit } from "@/lib/server/rate-limit";
import { getCurrentSession } from "@/server/api/session";

async function getId(params: Promise<unknown>) {
  const value = await params;
  return typeof value === "object" && value && "id" in value ? String((value as { id: unknown }).id) : "";
}

export async function GET(request: Request, { params }: { params: Promise<unknown> }) {
  const id = await getId(params);
  const session = await getCurrentSession();
  const ownerAddress = session?.address ?? request.headers.get("x-dev-wallet-address") ?? "";
  if (!ownerAddress) {
    return apiError("AUTH_REQUIRED", "Sign in with wallet before accessing agent integration", 401);
  }
  try {
    return await proxyToAetherApi(request, `/agents/${encodeURIComponent(id)}/integration`, {
      method: "GET",
      headers: { "x-dev-wallet-address": ownerAddress }
    });
  } catch (error) {
    return apiBackendUnavailable(error);
  }
}

export async function POST(request: Request, { params }: { params: Promise<unknown> }) {
  const id = await getId(params);
  const rate = rateLimit.check(`agent-integration:${getClientIp(request)}:${id}`, { limit: 20, windowMs: 60_000, critical: true });
  if (!rate.allowed) return apiError(rate.code ?? "RATE_LIMITED", rate.message ?? "Too many integration updates", rate.code ? 503 : 429);

  const session = await getCurrentSession();
  const devBypass = process.env.AETHER_DEV_AUTH_BYPASS === "true" && process.env.NODE_ENV !== "production";
  const body = await request.json().catch(() => ({}));
  const ownerAddress = session?.address ?? (devBypass && typeof body.ownerAddress === "string" ? body.ownerAddress : "");

  if (body.runtimeType === "HOSTED" && !body.agentEndpoint) {
    return apiError("HOSTED_ENDPOINT_REQUIRED", "Hosted agents require an HTTPS endpoint", 422);
  }

  if (!ownerAddress) {
    return apiError("AUTH_REQUIRED", "Sign in with wallet before accessing agent integration", 401);
  }

  try {
    return await proxyToAetherApi(request, `/agents/${encodeURIComponent(id)}/integration`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-dev-wallet-address": ownerAddress
      },
      body: JSON.stringify(body)
    });
  } catch (error) {
    return apiBackendUnavailable(error);
  }
}
