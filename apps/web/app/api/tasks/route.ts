import { apiError } from "@/lib/api/response";
import { apiBackendUnavailable, proxyToAetherApi } from "@/lib/server/aether-api";

export async function GET(request: Request) {
  try {
    return await proxyToAetherApi(request, "/tasks", { method: "GET" });
  } catch (error) {
    return apiError("TASKS_UNAVAILABLE", error instanceof Error ? error.message : "Unable to load tasks", 503);
  }
}

export async function POST(request: Request) {
  try {
    return await proxyToAetherApi(request, "/tasks", { method: "POST" });
  } catch (error) {
    return apiBackendUnavailable(error);
  }
}
