import { apiError, apiSuccess } from "@/lib/api/response";
import { getClientIp, rateLimit } from "@/lib/server/rate-limit";
import { runIndexerOnce } from "@/server/indexer/indexer";

export async function POST(request: Request) {
  const limited = rateLimit.check(`indexer:${getClientIp(request)}`, { limit: 10, windowMs: 60_000, critical: true });
  if (!limited.allowed) return apiError(limited.code ?? "RATE_LIMITED", limited.message ?? "Too many indexer requests", limited.code ? 503 : 429);
  const auth = request.headers.get("authorization");
  if (!process.env.INDEXER_ADMIN_TOKEN || auth !== `Bearer ${process.env.INDEXER_ADMIN_TOKEN}`) {
    return apiError("UNAUTHORIZED", "Indexer endpoint requires admin bearer token", 401);
  }

  try {
    return apiSuccess(await runIndexerOnce());
  } catch (error) {
    const message = error instanceof Error ? error.message : "Indexer failed";
    if (message.includes("does not exist") || message.includes("public.IndexerState")) {
      return apiError(
        "DATABASE_NOT_MIGRATED",
        "Database tables are missing. Run `npm run db:generate` and `npm run db:migrate` against the same DATABASE_URL, then restart the web server.",
        500
      );
    }
    return apiError("INDEXER_FAILED", message, 500);
  }
}
