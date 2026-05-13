import { z } from "zod";
import { apiError, apiSuccess } from "@/lib/api/response";
import { checkRateLimit, getClientIp } from "@/lib/server/rate-limit";
import { createNonce } from "@/server/api/auth";
import { addressSchema } from "@/server/api/schemas";

const nonceSchema = z.object({ address: addressSchema });

export async function POST(request: Request) {
  const rate = checkRateLimit(`nonce:${getClientIp(request)}`, 10);
  if (!rate.allowed) return apiError("RATE_LIMITED", "Too many nonce requests", 429);

  const parsed = nonceSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return apiError("INVALID_INPUT", "Invalid wallet address", 422, parsed.error.flatten());

  const nonce = await createNonce(parsed.data.address);
  return apiSuccess({ nonce, statement: "Sign in to AetherAgentAI. Testnet only until audited." });
}
