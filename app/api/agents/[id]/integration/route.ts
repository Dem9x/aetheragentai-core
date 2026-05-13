import { apiError, apiSuccess } from "@/lib/api/response";
import { checkRateLimit, getClientIp } from "@/lib/server/rate-limit";
import { agentIntegrationSchema, getAgentIntegration, saveAgentIntegration } from "@/server/agents/integration";

async function getId(params: Promise<unknown>) {
  const value = await params;
  return typeof value === "object" && value && "id" in value ? String((value as { id: unknown }).id) : "";
}

export async function GET(_: Request, { params }: { params: Promise<unknown> }) {
  const id = await getId(params);
  const integration = await getAgentIntegration(id);
  return apiSuccess({ integration });
}

export async function POST(request: Request, { params }: { params: Promise<unknown> }) {
  const id = await getId(params);
  const rate = checkRateLimit(`agent-integration:${getClientIp(request)}:${id}`, 20);
  if (!rate.allowed) return apiError("RATE_LIMITED", "Too many integration updates", 429);

  const parsed = agentIntegrationSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return apiError("INVALID_AGENT_INTEGRATION", "Invalid agent integration config", 422, parsed.error.flatten());

  if (parsed.data.runtimeType === "HOSTED" && !parsed.data.agentEndpoint) {
    return apiError("HOSTED_ENDPOINT_REQUIRED", "Hosted agents require an HTTPS endpoint", 422);
  }

  const integration = await saveAgentIntegration(id, parsed.data);
  return apiSuccess({
    integration,
    note: "Agent remains user-owned. Aether routes tasks, validates outputs, and records protocol rewards."
  });
}
