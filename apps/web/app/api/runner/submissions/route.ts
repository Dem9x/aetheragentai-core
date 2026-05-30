import { apiError } from "@/lib/api/response";
import { apiBackendUnavailable, proxyToAetherApi } from "@/lib/server/aether-api";
import { getClientIp, rateLimit } from "@/lib/server/rate-limit";

export async function POST(request: Request) {
  const limited = rateLimit.check(`runner-submissions:${getClientIp(request)}`, { limit: 30, windowMs: 60_000, critical: true });
  if (!limited.allowed) return apiError(limited.code ?? "RATE_LIMITED", limited.message ?? "Too many runner submissions", limited.code ? 503 : 429);
  try {
    return await proxyToAetherApi(request, "/runner/submissions", { method: "POST" });
  } catch (error) {
    return apiBackendUnavailable(error);
  }
}
