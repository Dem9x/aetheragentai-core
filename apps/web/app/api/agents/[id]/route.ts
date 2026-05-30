import { apiBackendUnavailable, proxyToAetherApi } from "@/lib/server/aether-api";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    return await proxyToAetherApi(request, `/agents/${encodeURIComponent(id)}`, { method: "GET" });
  } catch (error) {
    return apiBackendUnavailable(error);
  }
}
