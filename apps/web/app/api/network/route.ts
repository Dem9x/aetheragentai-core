import { apiError, apiSuccess } from "@/lib/api/response";
import { getApiNetworkOverview } from "@/lib/server/api-data";

export async function GET() {
  try {
    const overview = await getApiNetworkOverview();
    return apiSuccess(overview);
  } catch (error) {
    return apiError("NETWORK_UNAVAILABLE", error instanceof Error ? error.message : "Unable to load network stats", 503);
  }
}
