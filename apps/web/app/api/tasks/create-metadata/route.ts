import { apiError, apiSuccess } from "@/lib/api/response";
import { checkRateLimit, getClientIp } from "@/lib/server/rate-limit";
import { createTask } from "@/lib/server/core-data";
import { taskMetadataSchema } from "@/server/api/schemas";
import { requireAdminSession } from "@/server/api/admin";
import { getCurrentSession } from "@/server/api/session";
import { getMetadataStorage } from "@/server/storage/metadata";

export async function POST(request: Request) {
  const rate = checkRateLimit(`task-metadata:${getClientIp(request)}`, 20);
  if (!rate.allowed) return apiError("RATE_LIMITED", "Too many task metadata writes", 429);

  const parsed = taskMetadataSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return apiError("INVALID_TASK_METADATA", "Invalid task metadata", 422, parsed.error.flatten());

  const session = await getCurrentSession();
  if (!session) return apiError("AUTH_REQUIRED", "Sign in with your wallet before creating a real task.", 401);

  const creatorType = parsed.data.creatorType;
  const requiresAdmin = creatorType === "PROTOCOL" || creatorType === "DAO" || creatorType === "SYSTEM";
  if (requiresAdmin) {
    const admin = await requireAdminSession();
    if (!admin.ok) {
      return apiError("ADMIN_ROLE_REQUIRED", `${creatorType} tasks can only be created by an admin wallet in ADMIN_WALLET_ADDRESSES.`, 403);
    }
  }

  if (!requiresAdmin && parsed.data.creatorAddress.toLowerCase() !== session.address.toLowerCase()) {
    return apiError("OWNER_MISMATCH", "creatorAddress must match the signed-in wallet for USER or DEVELOPER tasks.", 403);
  }

  const metadata = {
    ...parsed.data,
    creatorAddress: session.address.toLowerCase()
  };
  const stored = await getMetadataStorage().put("task", metadata);
  const task = await createTask({
    creatorType,
    creatorName: parsed.data.creatorName,
    creatorAddress: session.address,
    creatorLabel: parsed.data.creatorLabel,
    metadataURI: stored.metadataURI,
    metadataHash: stored.metadataHash,
    title: parsed.data.title,
    category: parsed.data.category,
    rewardAmount: parsed.data.rewardAmount,
    rewardToken: parsed.data.rewardToken,
    fundingStatus: parsed.data.fundingStatus,
    deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    validationMethod: parsed.data.validationMethod,
    requiredValidatorQuorum: parsed.data.requiredValidatorQuorum,
    passingScore: parsed.data.passingScore
  });

  return apiSuccess({ task, metadataURI: stored.metadataURI, metadataHash: stored.metadataHash }, { status: 201 });
}
