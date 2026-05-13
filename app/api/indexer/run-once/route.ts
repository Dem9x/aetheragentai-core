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
    return apiError("INDEXER_FAILED", error instanceof Error ? error.message : "Indexer failed", 500);
  }
}
