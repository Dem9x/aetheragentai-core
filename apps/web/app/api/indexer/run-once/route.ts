import { apiError, apiSuccess } from "@/lib/api/response";
import { getClientIp, rateLimit } from "@/lib/server/rate-limit";

export async function POST(request: Request) {
  const limited = rateLimit.check(`indexer:${getClientIp(request)}`, { limit: 10, windowMs: 60_000, critical: true });
  if (!limited.allowed) return apiError(limited.code ?? "RATE_LIMITED", limited.message ?? "Too many indexer requests", limited.code ? 503 : 429);
  const auth = request.headers.get("authorization");
  if (!process.env.INDEXER_ADMIN_TOKEN || auth !== `Bearer ${process.env.INDEXER_ADMIN_TOKEN}`) {
    return apiError("UNAUTHORIZED", "Indexer endpoint requires admin bearer token", 401);
  }

  return apiSuccess({
    disabled: true,
    message: "Prisma/PostgreSQL indexer is disabled. Use apps/api MongoDB data for the MVP backend."
  });
}
