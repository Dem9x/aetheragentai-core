import { apiError, apiSuccess } from "@/lib/api/response";
import { readData } from "@/lib/server/datastore";
import { verifyRunnerRequest } from "@/server/agents/runner-auth";

export async function GET(request: Request) {
  const agentId = request.headers.get("x-agent-id") ?? "";
  if (!agentId) return apiError("AGENT_ID_REQUIRED", "x-agent-id header is required", 401);

  const auth = await verifyRunnerRequest(request, agentId);
  if (!auth.ok) return apiError(auth.code, auth.message, auth.status);

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
    runtimeType: auth.integration.runtimeType,
    tasks,
    safety: "Do not submit private chain-of-thought. Submit concise outputs, hashes, and metadata URIs only."
  });
}
