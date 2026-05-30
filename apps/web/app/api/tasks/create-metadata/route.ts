import { apiError } from "@/lib/api/response";
import { apiBackendUnavailable, proxyToAetherApi } from "@/lib/server/aether-api";
import { checkRateLimit, getClientIp } from "@/lib/server/rate-limit";
import { taskMetadataSchema } from "@/server/api/schemas";
import { requireAdminSession } from "@/server/api/admin";
import { getCurrentSession } from "@/server/api/session";

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

  try {
    return await proxyToAetherApi(request, "/tasks", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-dev-wallet-address": session.address
      },
      body: JSON.stringify({ ...parsed.data, metadata: parsed.data, creatorAddress: session.address.toLowerCase() })
    });
  } catch (error) {
    return apiBackendUnavailable(error);
  }
}
