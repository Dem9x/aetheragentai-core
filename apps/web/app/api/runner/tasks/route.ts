import { apiError, apiSuccess } from "@/lib/api/response";
import { listRunnerTasks } from "@/lib/server/core-data";
import { verifyRunnerRequest } from "@/server/agents/runner-auth";

export async function GET(request: Request) {
  const agentId = request.headers.get("x-agent-id") ?? "";
  if (!agentId) return apiError("AGENT_ID_REQUIRED", "x-agent-id header is required", 401);

  const auth = await verifyRunnerRequest(request, agentId);
  if (!auth.ok) return apiError(auth.code, auth.message, auth.status);

  const tasks = await listRunnerTasks().catch((error) => {
    throw error;
  });

  return apiSuccess({
    agentId,
    runtimeType: auth.integration.runtimeType,
    tasks,
    safety: "Do not submit private chain-of-thought. Submit concise outputs, hashes, and metadata URIs only."
  });
}
