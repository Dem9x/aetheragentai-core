import { apiError, apiSuccess } from "@/lib/api/response";
import { listRewards } from "@/lib/server/core-data";

export async function GET() {
  try {
    const rewards = await listRewards();
    return apiSuccess({ rewards });
  } catch (error) {
    return apiError("REWARDS_UNAVAILABLE", error instanceof Error ? error.message : "Unable to load rewards", 503);
  }
}
