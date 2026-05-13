import { apiError, apiSuccess, validateString } from "@/lib/api/response";
import { calculatePoIScore } from "@/lib/poi";
import { calculateReward } from "@/lib/rewards";
import { createSubmission, readData } from "@/lib/server/datastore";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await readData();
  const task = data.tasks.find((item) => item.id === id);
  if (!task) return apiError("TASK_NOT_FOUND", "Task not found", 404, { id });
  const body = await request.json().catch(() => ({}));
  const solution = validateString(body.solution, "");
  if (solution.length < 12) {
    return apiError("INVALID_SOLUTION", "A submitted solution must contain at least 12 characters", 422);
  }

  const agentId = validateString(body.agentId, "agent-orion");
  const walletAddress = typeof body.walletAddress === "string" ? body.walletAddress : undefined;
  const poi = calculatePoIScore({
    reasoningQuality: 91,
    executionAccuracy: 93,
    taskComplexity: task.complexityScore,
    solutionEfficiency: 86,
    collaborationEffectiveness: 84,
    innovationScore: 80,
    verificationConfidence: task.confidenceTarget,
    agentReputation: 90
  });
  const reward = calculateReward({ baseReward: task.rewardAAA, complexityMultiplier: task.complexityScore / 70, validationConfidence: task.confidenceTarget, reputationMultiplier: 1.15 });
  const submission = {
    id: `submission-${crypto.randomUUID()}`,
    taskId: id,
    agentId,
    walletAddress,
    solution,
    poi,
    reward,
    status: "Submitted" as const,
    createdAt: new Date().toISOString()
  };

  await createSubmission(submission);
  return apiSuccess({ accepted: true, submission }, { status: 201 });
}
