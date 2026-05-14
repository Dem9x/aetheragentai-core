import { apiError, apiSuccess } from "@/lib/api/response";
import { getClientIp, rateLimit } from "@/lib/server/rate-limit";
import { prisma, databaseConfigured } from "@/lib/server/prisma";
import { agentIntegrationSchema, getAgentIntegration, saveAgentIntegration } from "@/server/agents/integration";
import { getCurrentSession } from "@/server/api/session";
import { requireAdminSession } from "@/server/api/admin";

async function getId(params: Promise<unknown>) {
  const value = await params;
  return typeof value === "object" && value && "id" in value ? String((value as { id: unknown }).id) : "";
}

export async function GET(_: Request, { params }: { params: Promise<unknown> }) {
  const id = await getId(params);
  const auth = await authorizeAgentOwner(id);
  if (!auth.ok) return apiError(auth.code, auth.message, auth.status);
  const integration = await getAgentIntegration(id);
  return apiSuccess({ integration });
}

export async function POST(request: Request, { params }: { params: Promise<unknown> }) {
  const id = await getId(params);
  const rate = rateLimit.check(`agent-integration:${getClientIp(request)}:${id}`, { limit: 20, windowMs: 60_000, critical: true });
  if (!rate.allowed) return apiError(rate.code ?? "RATE_LIMITED", rate.message ?? "Too many integration updates", rate.code ? 503 : 429);

  const auth = await authorizeAgentOwner(id);
  if (!auth.ok) return apiError(auth.code, auth.message, auth.status);

  const parsed = agentIntegrationSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return apiError("INVALID_AGENT_INTEGRATION", "Invalid agent integration config", 422, parsed.error.flatten());

  if (parsed.data.runtimeType === "HOSTED" && !parsed.data.agentEndpoint) {
    return apiError("HOSTED_ENDPOINT_REQUIRED", "Hosted agents require an HTTPS endpoint", 422);
  }

  const integration = await saveAgentIntegration(id, parsed.data);
  return apiSuccess({
    integration,
    note: "Agent remains user-owned. Aether routes tasks, validates outputs, and records protocol rewards."
  });
}

async function authorizeAgentOwner(agentId: string) {
  if (process.env.AETHER_DEV_AUTH_BYPASS === "true" && process.env.NODE_ENV !== "production") {
    return { ok: true as const };
  }
  if (!databaseConfigured) {
    return { ok: false as const, status: 503, code: "DATABASE_REQUIRED", message: "Agent ownership checks require DATABASE_URL." };
  }
  const agent = await prisma.agent.findUnique({ where: { id: agentId }, select: { ownerAddress: true } });
  if (!agent) return { ok: false as const, status: 404, code: "AGENT_NOT_FOUND", message: "Agent not found" };
  const session = await getCurrentSession();
  if (!session) return { ok: false as const, status: 401, code: "AUTH_REQUIRED", message: "Sign in with wallet before accessing agent integration" };
  if (session.address.toLowerCase() === agent.ownerAddress.toLowerCase()) return { ok: true as const };
  const admin = await requireAdminSession();
  if (admin.ok) return { ok: true as const };
  return { ok: false as const, status: 403, code: "FORBIDDEN", message: "Only the agent owner can access this integration" };
}
