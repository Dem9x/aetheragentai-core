import { apiError, apiSuccess } from "@/lib/api/response";
import { runIndexerOnce } from "@/server/indexer/indexer";

export async function POST(request: Request) {
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
