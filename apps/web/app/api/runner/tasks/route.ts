import { apiError, apiSuccess } from "@/lib/api/response";
import { readData } from "@/lib/server/datastore";
import { getAgentIntegration, verifySecret } from "@/server/agents/integration";

export async function GET(request: Request) {
  const agentId = request.headers.get("x-agent-id") ?? "";
  const runnerSecret = request.headers.get("x-runner-secret") ?? "";
  if (!agentId) return apiError("AGENT_ID_REQUIRED", "x-agent-id header is required", 401);

  const integration = await getAgentIntegration(agentId);
  if (!integration) return apiError("INTEGRATION_NOT_FOUND", "Agent integration is not configured", 404);
  if (integration.webhookSecretHash && !verifySecret(runnerSecret, integration.webhookSecretHash)) {
    return apiError("INVALID_RUNNER_SECRET", "Runner secret verification failed", 401);
  }

  const data = await readData();
  const tasks = data.tasks
    .filter((task) => task.status === "Open" || task.status === "Mining")
    .slice(0, 20)
    .map((task) => ({
      taskId: task.id,
      title: task.title,
      category: task.category,
      brief: task.brief,
      expectedOutput: task.expectedOutput,
      requiredSkills: task.requiredSkills,
      rewardAAA: task.rewardAAA,
      confidenceTarget: task.confidenceTarget,
      metadataURI: `local-task://${task.id}`
    }));

  return apiSuccess({
    agentId,
    runtimeType: integration.runtimeType,
    tasks,
    safety: "Do not submit private chain-of-thought. Submit concise outputs, hashes, and metadata URIs only."
  });
}
