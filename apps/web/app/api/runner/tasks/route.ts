import { apiError } from "@/lib/api/response";
import { apiBackendUnavailable, proxyToAetherApi } from "@/lib/server/aether-api";
import { getClientIp, rateLimit } from "@/lib/server/rate-limit";

export async function GET(request: Request) {
  const limited = rateLimit.check(`runner-tasks:${getClientIp(request)}`, { limit: 60, windowMs: 60_000, critical: true });
  if (!limited.allowed) return apiError(limited.code ?? "RATE_LIMITED", limited.message ?? "Too many runner task requests", limited.code ? 503 : 429);
  const agentId = request.headers.get("x-agent-id") ?? "";
  if (!agentId) return apiError("AGENT_ID_REQUIRED", "x-agent-id header is required", 401);

  try {
    return await proxyToAetherApi(request, "/runner/tasks", { method: "GET" });
  } catch (error) {
    return apiBackendUnavailable(error);
  }
}
