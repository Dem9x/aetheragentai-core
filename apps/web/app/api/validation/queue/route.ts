import { apiError, apiSuccess } from "@/lib/api/response";
import { prisma } from "@/lib/server/prisma";
import { requireValidatorSession } from "@/server/api/validator";

export async function GET() {
  const auth = await requireValidatorSession();
  if (!auth.configured) return apiError("VALIDATOR_NOT_CONFIGURED", "Set VALIDATOR_WALLET_ADDRESSES or ADMIN_WALLET_ADDRESSES before using the validator console.", 403);
  if (!auth.session) return apiError("AUTH_REQUIRED", "Sign in with a validator wallet before opening the validation queue.", 401);
  if (!auth.ok) return apiError("VALIDATOR_ROLE_REQUIRED", "Connected wallet is not authorized as validator.", 403);

  const [submissions, stats] = await Promise.all([
    prisma.submission.findMany({
      where: { status: { in: ["SUBMITTED", "VALIDATED"] } },
      orderBy: { createdAt: "desc" },
      take: 100,
      include: {
        task: true,
        agent: true,
        validations: { orderBy: { createdAt: "desc" } }
      }
    }),
    Promise.all([
      prisma.submission.count({ where: { status: "SUBMITTED" } }),
      prisma.validation.count(),
      prisma.task.count({ where: { validationStatus: "FINALIZED" } }),
      prisma.reward.count({ where: { status: "CLAIMABLE" } })
    ])
  ]);

  const [pendingSubmissions, totalValidations, finalizedTasks, claimableRewards] = stats;
  return apiSuccess({
    access: {
      address: auth.session.address,
      isValidator: auth.isValidator,
      isAdmin: auth.isAdmin
    },
    stats: {
      pendingSubmissions,
      totalValidations,
      finalizedTasks,
      claimableRewards
    },
    submissions: submissions.map((submission) => ({
      id: submission.id,
      chainSubmissionId: submission.chainSubmissionId?.toString() ?? null,
      taskId: submission.taskId,
      chainTaskId: submission.task.chainTaskId?.toString() ?? null,
      taskTitle: submission.task.title,
      taskRewardAmount: submission.task.rewardAmount.toString(),
      taskPassingScore: submission.task.passingScore,
      requiredValidatorQuorum: submission.task.requiredValidatorQuorum,
      taskValidationStatus: submission.task.validationStatus,
      taskSettlementStatus: submission.task.settlementStatus,
      agentId: submission.agentId,
      agentName: submission.agent?.name ?? null,
      submitterAddress: submission.submitterAddress,
      solutionURI: submission.solutionURI,
      solutionHash: submission.solutionHash,
      status: submission.status,
      poiScore: submission.poiScore?.toString() ?? null,
      createdAt: submission.createdAt.toISOString(),
      validations: submission.validations.map((validation) => ({
        id: validation.id,
        validatorAddress: validation.validatorAddress,
        score: validation.score,
        confidence: validation.confidence,
        resultURI: validation.resultURI,
        finalized: validation.finalized,
        createdAt: validation.createdAt.toISOString()
      }))
    })),
    safety: "AI validation can be imperfect. Rewards are protocol-based and not guaranteed."
  });
}
