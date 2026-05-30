import { z } from "zod";
import { apiError, apiSuccess } from "@/lib/api/response";
import { prisma } from "@/lib/server/prisma";
import { getClientIp, rateLimit } from "@/lib/server/rate-limit";
import { getStorageProvider } from "@/lib/server/storage";
import { calculateReward } from "@/lib/rewards";
import { requireValidatorSession } from "@/server/api/validator";

const validationSubmitSchema = z.object({
  score: z.number().int().min(0).max(100),
  confidence: z.number().int().min(0).max(100),
  reason: z.string().min(8).max(2000),
  formatPass: z.boolean().default(true),
  safetyPass: z.boolean().default(true),
  resultURI: z.string().min(4).max(500).optional(),
  resultHash: z.string().regex(/^0x[a-fA-F0-9]{64}$/).optional()
});

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const limited = rateLimit.check(`validation-submit:${getClientIp(request)}:${id}`, { limit: 20, windowMs: 60_000, critical: true });
  if (!limited.allowed) return apiError(limited.code ?? "RATE_LIMITED", limited.message ?? "Too many validation submissions", limited.code ? 503 : 429);

  const auth = await requireValidatorSession();
  if (!auth.configured) return apiError("VALIDATOR_NOT_CONFIGURED", "Set VALIDATOR_WALLET_ADDRESSES or ADMIN_WALLET_ADDRESSES before submitting validation.", 403);
  if (!auth.session) return apiError("AUTH_REQUIRED", "Sign in with a validator wallet before submitting validation.", 401);
  if (!auth.ok) return apiError("VALIDATOR_ROLE_REQUIRED", "Connected wallet is not authorized as validator.", 403);

  const parsed = validationSubmitSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return apiError("INVALID_VALIDATION", "Invalid validation payload", 422, parsed.error.flatten());

  const submission = await prisma.submission.findUnique({
    where: { id },
    include: {
      task: true,
      agent: { include: { stats: true } },
      validations: true
    }
  });
  if (!submission) return apiError("SUBMISSION_NOT_FOUND", "Submission not found", 404, { id });
  if (submission.status === "REJECTED") return apiError("SUBMISSION_REJECTED", "Rejected submissions cannot be validated again.", 409);

  const validatorAddress = auth.session.address.toLowerCase();
  if (submission.validations.some((validation) => validation.validatorAddress.toLowerCase() === validatorAddress)) {
    return apiError("DUPLICATE_VALIDATION", "This validator already scored the submission.", 409);
  }

  const stored = parsed.data.resultURI && parsed.data.resultHash
    ? { uri: parsed.data.resultURI, hash: parsed.data.resultHash }
    : await (await getStorageProvider()).uploadJSON({
        submissionId: id,
        validatorAddress,
        score: parsed.data.score,
        confidence: parsed.data.confidence,
        reason: parsed.data.reason,
        formatPass: parsed.data.formatPass,
        safetyPass: parsed.data.safetyPass
      }, { prefix: "validations" });

  const existing = submission.validations;
  const nextCount = existing.length + 1;
  const scoreSum = existing.reduce((sum, validation) => sum + validation.score, parsed.data.score);
  const confidenceSum = existing.reduce((sum, validation) => sum + validation.confidence, parsed.data.confidence);
  const averageScore = Math.round(scoreSum / nextCount);
  const averageConfidence = Math.round(confidenceSum / nextCount);
  const quorumMet = nextCount >= submission.task.requiredValidatorQuorum;
  const accepted = quorumMet && parsed.data.formatPass && parsed.data.safetyPass && averageScore >= submission.task.passingScore;
  const reward = calculateReward({
    baseReward: Number(submission.task.rewardAmount.toString()),
    complexityMultiplier: Math.max(1, submission.task.passingScore / 70),
    validationConfidence: averageConfidence,
    reputationMultiplier: 1 + Math.min(100, submission.agent?.reputation ?? 0) / 500
  });

  const result = await prisma.$transaction(async (tx) => {
    const validation = await tx.validation.create({
      data: {
        taskId: submission.taskId,
        submissionId: submission.id,
        validatorAddress,
        score: parsed.data.score,
        confidence: parsed.data.confidence,
        resultURI: stored.uri,
        resultHash: stored.hash,
        finalized: quorumMet
      }
    });

    await tx.taskStats.upsert({
      where: { taskId: submission.taskId },
      update: { validatorCount: nextCount },
      create: { taskId: submission.taskId, validatorCount: nextCount, submissionCount: 1 }
    });

    await tx.task.update({
      where: { id: submission.taskId },
      data: {
        validatorCount: nextCount,
        validationStatus: quorumMet ? "FINALIZED" : "IN_VALIDATION",
        settlementStatus: quorumMet ? (accepted ? "CLAIMABLE" : "NOT_READY") : "NOT_READY",
        status: quorumMet ? (accepted ? "SOLVED" : "VALIDATING") : "VALIDATING",
        solvedAt: quorumMet && accepted ? new Date() : submission.task.solvedAt,
        finalizedBy: quorumMet ? validatorAddress : submission.task.finalizedBy
      }
    });

    await tx.submission.update({
      where: { id: submission.id },
      data: {
        status: quorumMet ? (accepted ? "VALIDATED" : "REJECTED") : "SUBMITTED",
        poiScore: averageScore
      }
    });

    if (submission.agentId && quorumMet && accepted) {
      await tx.agent.update({
        where: { id: submission.agentId },
        data: { reputation: { increment: Math.max(1, Math.round(averageScore / 10)) } }
      });
      await tx.agentStats.upsert({
        where: { agentId: submission.agentId },
        update: {
          solvedTasks: { increment: 1 },
          validationConfidence: averageConfidence,
          poiScore: averageScore,
          totalRewards: { increment: reward.amount.toString() }
        },
        create: {
          agentId: submission.agentId,
          solvedTasks: 1,
          validationConfidence: averageConfidence,
          poiScore: averageScore,
          totalRewards: reward.amount.toString()
        }
      });
    }

    if (quorumMet && accepted) {
      await tx.reward.upsert({
        where: { id: `validation:${submission.id}` },
        create: {
          id: `validation:${submission.id}`,
          taskId: submission.taskId,
          submissionId: submission.id,
          recipientAddress: submission.submitterAddress.toLowerCase(),
          amount: reward.amount.toString(),
          status: "CLAIMABLE"
        },
        update: {
          amount: reward.amount.toString(),
          status: "CLAIMABLE"
        }
      });
    }

    await tx.activityLog.create({
      data: {
        type: quorumMet ? "VALIDATION_FINALIZED" : "VALIDATION_SUBMITTED",
        severity: quorumMet ? (accepted ? "success" : "warning") : "info",
        message: quorumMet
          ? `Validation finalized for ${submission.task.title}: ${averageScore} score`
          : `Validator scored ${submission.task.title}: ${parsed.data.score}`
      }
    });

    return validation;
  });

  return apiSuccess({
    validation: result,
    aggregate: {
      validatorCount: nextCount,
      averageScore,
      averageConfidence,
      quorumMet,
      accepted,
      claimableRewardAAA: quorumMet && accepted ? reward.amount : 0
    },
    safety: "MVP validation finalizes database reward records first. On-chain reward allocation still requires authorized finalizer execution."
  }, { status: 201 });
}
