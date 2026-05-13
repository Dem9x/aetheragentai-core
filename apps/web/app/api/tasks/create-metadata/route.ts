import { apiError, apiSuccess } from "@/lib/api/response";
import { checkRateLimit, getClientIp } from "@/lib/server/rate-limit";
import { prisma } from "@/lib/server/prisma";
import { taskMetadataSchema } from "@/server/api/schemas";
import { getMetadataStorage } from "@/server/storage/metadata";

export async function POST(request: Request) {
  const rate = checkRateLimit(`task-metadata:${getClientIp(request)}`, 20);
  if (!rate.allowed) return apiError("RATE_LIMITED", "Too many task metadata writes", 429);

  const parsed = taskMetadataSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return apiError("INVALID_TASK_METADATA", "Invalid task metadata", 422, parsed.error.flatten());

  const stored = await getMetadataStorage().put("task", parsed.data);
  const task = await prisma.task.create({
    data: {
      creatorType: parsed.data.creatorType,
      creatorName: parsed.data.creatorName,
      creatorAddress: parsed.data.creatorAddress.toLowerCase(),
      creatorLabel: parsed.data.creatorLabel,
      metadataURI: stored.metadataURI,
      metadataHash: stored.metadataHash,
      title: parsed.data.title,
      category: parsed.data.category,
      rewardAmount: parsed.data.rewardAmount.toString(),
      rewardToken: parsed.data.rewardToken,
      fundingStatus: parsed.data.fundingStatus,
      deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      status: "DRAFT",
      validationMethod: parsed.data.validationMethod,
      validationStatus: "NOT_STARTED",
      requiredValidatorQuorum: parsed.data.requiredValidatorQuorum,
      passingScore: parsed.data.passingScore,
      settlementStatus: "NOT_READY"
    }
  });

  return apiSuccess({ task, metadataURI: stored.metadataURI, metadataHash: stored.metadataHash }, { status: 201 });
}
