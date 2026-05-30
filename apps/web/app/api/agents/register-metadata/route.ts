import { apiError } from "@/lib/api/response";
import { apiBackendUnavailable, proxyToAetherApi } from "@/lib/server/aether-api";
import { checkRateLimit, getClientIp } from "@/lib/server/rate-limit";
import { agentMetadataSchema } from "@/server/api/schemas";

export async function POST(request: Request) {
  const rate = checkRateLimit(`agent-metadata:${getClientIp(request)}`, 20);
  if (!rate.allowed) return apiError("RATE_LIMITED", "Too many metadata writes", 429);

  const parsed = agentMetadataSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return apiError("INVALID_AGENT_METADATA", "Invalid agent metadata", 422, parsed.error.flatten());

  try {
    return await proxyToAetherApi(request, "/agents", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-dev-wallet-address": parsed.data.ownerAddress
      },
      body: JSON.stringify({
        ownerAddress: parsed.data.ownerAddress,
        name: parsed.data.name,
        description: parsed.data.description,
        agentType: parsed.data.agentType,
        metadata: parsed.data
      })
    });
  } catch (error) {
    return apiBackendUnavailable(error);
  }
}
