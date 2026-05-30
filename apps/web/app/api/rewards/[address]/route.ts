import { apiError } from "@/lib/api/response";
import { apiBackendUnavailable, proxyToAetherApi } from "@/lib/server/aether-api";
import { addressSchema } from "@/server/api/schemas";

export async function GET(request: Request, { params }: { params: Promise<{ address: string }> }) {
  const { address } = await params;
  const parsed = addressSchema.safeParse(address);
  if (!parsed.success) return apiError("INVALID_ADDRESS", "Invalid EVM address", 422);

  try {
    return await proxyToAetherApi(request, `/rewards/${address.toLowerCase()}`, { method: "GET" });
  } catch (error) {
    return apiBackendUnavailable(error);
  }
}
