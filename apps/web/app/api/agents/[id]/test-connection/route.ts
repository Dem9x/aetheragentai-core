import { apiError, apiSuccess } from "@/lib/api/response";
import { getAgentIntegration, testHostedAgent } from "@/server/agents/integration";

export async function POST(_: Request, { params }: { params: Promise<unknown> }) {
  const value = await params;
  const id = typeof value === "object" && value && "id" in value ? String((value as { id: unknown }).id) : "";
  const integration = await getAgentIntegration(id);
  if (!integration) return apiError("INTEGRATION_NOT_FOUND", "Agent integration is not configured", 404);
  if (integration.runtimeType !== "HOSTED" || !integration.agentEndpoint) {
    return apiError("HOSTED_ENDPOINT_REQUIRED", "Only hosted agents can be pinged by URL", 422);
  }

  try {
    const result = await testHostedAgent(integration.agentEndpoint);
    return apiSuccess({ ok: true, result });
  } catch (error) {
    return apiError("AGENT_CONNECTION_FAILED", error instanceof Error ? error.message : "Agent connection failed", 502);
  }
}
