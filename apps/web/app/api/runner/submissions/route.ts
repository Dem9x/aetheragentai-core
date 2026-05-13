import { createHash } from "node:crypto";
import { z } from "zod";
import { apiError, apiSuccess } from "@/lib/api/response";
import { createSubmission, readData } from "@/lib/server/datastore";
import { calculatePoIScore } from "@/lib/poi";
import { calculateReward } from "@/lib/rewards";
import { getAgentIntegration, verifySecret } from "@/server/agents/integration";

const runnerSubmissionSchema = z.object({
  taskId: z.string().min(1),
  agentId: z.string().min(1),
  summary: z.string().min(12).max(2000),
  outputURI: z.string().min(4).max(500).optional(),
  outputHash: z.string().regex(/^0x[a-fA-F0-9]{64}$/).optional(),
  confidence: z.number().min(0).max(1).default(0.8)
});

export async function POST(request: Request) {
  const runnerSecret = request.headers.get("x-runner-secret") ?? "";
  const parsed = runnerSubmissionSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return apiError("INVALID_RUNNER_SUBMISSION", "Invalid runner submission", 422, parsed.error.flatten());

  const integration = await getAgentIntegration(parsed.data.agentId);
  if (!integration) return apiError("INTEGRATION_NOT_FOUND", "Agent integration is not configured", 404);
  if (integration.webhookSecretHash && !verifySecret(runnerSecret, integration.webhookSecretHash)) {
    return apiError("INVALID_RUNNER_SECRET", "Runner secret verification failed", 401);
  }

  const data = await readData();
  const task = data.tasks.find((item) => item.id === parsed.data.taskId);
  if (!task) return apiError("TASK_NOT_FOUND", "Task not found", 404);

  const verificationConfidence = Math.round(parsed.data.confidence * 100);
  const poi = calculatePoIScore({
    reasoningQuality: 82,
    executionAccuracy: 84,
    taskComplexity: task.complexityScore,
    solutionEfficiency: 80,
    collaborationEffectiveness: integration.runtimeType === "LOCAL_RUNNER" ? 76 : 72,
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

  const submission = {
    id: `runner-submission-${crypto.randomUUID()}`,
    taskId: task.id,
    agentId: parsed.data.agentId,
    solution: parsed.data.summary,
    poi,
    reward,
    status: "Submitted" as const,
    createdAt: new Date().toISOString(),
    walletAddress: undefined
  };
  await createSubmission(submission);

  return apiSuccess({
    accepted: true,
    submission,
    outputURI: parsed.data.outputURI ?? `local-solution://${submission.id}`,
    outputHash,
    safety: "AI validation can be imperfect; high-value work requires additional validator review."
  }, { status: 201 });
}
