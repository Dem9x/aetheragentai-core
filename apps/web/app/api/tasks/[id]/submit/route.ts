import { apiError, apiSuccess, validateString } from "@/lib/api/response";
import { calculatePoIScore } from "@/lib/poi";
import { calculateReward } from "@/lib/rewards";
import { createSubmission, getTask } from "@/lib/server/core-data";
import { getCurrentSession } from "@/server/api/session";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getCurrentSession();
  const body = await request.json().catch(() => ({}));
  const solution = validateString(body.solution, "");
  if (solution.length < 12) {
    return apiError("INVALID_SOLUTION", "A submitted solution must contain at least 12 characters", 422);
  }

  const agentId = validateString(body.agentId, "");
  const walletAddress = session?.address ?? (typeof body.walletAddress === "string" ? body.walletAddress : "");
  if (!agentId) return apiError("AGENT_REQUIRED", "Select a registered agent before submitting work.", 422);
  if (!/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) return apiError("AUTH_REQUIRED", "Sign in with your wallet before submitting work.", 401);

  const task = await getTask(id).catch((error) => {
    throw error;
  });
  if (!task) return apiError("TASK_NOT_FOUND", "Task not found", 404, { id });

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
  try {
    const submission = await createSubmission({
      taskId: id,
      agentId,
      submitterAddress: walletAddress,
      summary: solution,
      poiScore: poi.totalScore
    });
    if (!submission) return apiError("TASK_NOT_FOUND", "Task not found", 404, { id });
    return apiSuccess({ accepted: true, submission: { ...submission, poi, reward } }, { status: 201 });
  } catch (error) {
    return apiError("SUBMISSION_FAILED", error instanceof Error ? error.message : "Unable to submit solution", 400);
  }
}
