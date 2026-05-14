import { createHash } from "node:crypto";
import { z } from "zod";
import { apiError, apiSuccess } from "@/lib/api/response";
import { createSubmission, getTask } from "@/lib/server/core-data";
import { calculatePoIScore } from "@/lib/poi";
import { calculateReward } from "@/lib/rewards";
import { verifyRunnerRequest } from "@/server/agents/runner-auth";

const runnerSubmissionSchema = z.object({
  taskId: z.string().min(1),
  agentId: z.string().min(1),
  summary: z.string().min(12).max(2000),
  outputURI: z.string().min(4).max(500).optional(),
  outputHash: z.string().regex(/^0x[a-fA-F0-9]{64}$/).optional(),
  confidence: z.number().min(0).max(1).default(0.8)
});

export async function POST(request: Request) {
  const bodyText = await request.text();
  let body: unknown = {};
  try {
    body = bodyText ? JSON.parse(bodyText) : {};
  } catch {
    return apiError("INVALID_JSON", "Request body must be valid JSON", 400);
  }
  const parsed = runnerSubmissionSchema.safeParse(body);
  if (!parsed.success) return apiError("INVALID_RUNNER_SUBMISSION", "Invalid runner submission", 422, parsed.error.flatten());

  const auth = await verifyRunnerRequest(request, parsed.data.agentId, bodyText);
  if (!auth.ok) return apiError(auth.code, auth.message, auth.status);

  const task = await getTask(parsed.data.taskId).catch((error) => {
    throw error;
  });
  if (!task) return apiError("TASK_NOT_FOUND", "Task not found", 404);

  const verificationConfidence = Math.round(parsed.data.confidence * 100);
  const poi = calculatePoIScore({
    reasoningQuality: 82,
    executionAccuracy: 84,
    taskComplexity: task.complexityScore,
    solutionEfficiency: 80,
    collaborationEffectiveness: auth.integration.runtimeType === "LOCAL_RUNNER" ? 76 : 72,
    innovationScore: 74,
    verificationConfidence,
    agentReputation: 70
  });
  const reward = calculateReward({
    baseReward: task.rewardAAA,
    complexityMultiplier: Math.max(1, task.complexityScore / 70),
    validationConfidence: verificationConfidence,
    reputationMultiplier: 1.12
  });
  const outputHash = parsed.data.outputHash ?? `0x${createHash("sha256").update(parsed.data.summary).digest("hex")}`;

  const submission = await createSubmission({
    taskId: task.id,
    agentId: parsed.data.agentId,
    submitterAddress: "0x0000000000000000000000000000000000000000",
    summary: parsed.data.summary,
    outputURI: parsed.data.outputURI,
    outputHash,
    poiScore: poi.totalScore
  });
  if (!submission) return apiError("TASK_NOT_FOUND", "Task not found", 404);

  return apiSuccess({
    accepted: true,
    submission: { ...submission, poi, reward },
    outputURI: parsed.data.outputURI ?? submission.solution,
    outputHash,
    safety: "AI validation can be imperfect; high-value work requires additional validator review."
  }, { status: 201 });
}
