import { apiError, apiSuccess } from "@/lib/api/response";
import { getNetworkOverview } from "@/lib/server/core-data";

export async function GET() {
  try {
    const overview = await getNetworkOverview();
    return apiSuccess(overview);
  } catch (error) {
    return apiError("NETWORK_UNAVAILABLE", error instanceof Error ? error.message : "Unable to load network stats", 503);
  }
}
