import { apiError } from "@/lib/api/response";
import { apiBackendUnavailable, proxyToAetherApi } from "@/lib/server/aether-api";

export async function GET(request: Request) {
  try {
    return await proxyToAetherApi(request, "/validations/queue", { method: "GET" });
  } catch (error) {
    return apiBackendUnavailable(error);
  }
}
