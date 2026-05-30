import { apiError, apiSuccess } from "@/lib/api/response";
import { listApiRewards } from "@/lib/server/api-data";

export async function GET() {
  try {
    const rewards = await listApiRewards();
    return apiSuccess({ rewards });
  } catch (error) {
    return apiError("REWARDS_UNAVAILABLE", error instanceof Error ? error.message : "Unable to load rewards", 503);
  }
}
