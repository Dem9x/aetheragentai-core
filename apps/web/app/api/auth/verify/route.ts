import { cookies } from "next/headers";
import { z } from "zod";
import { apiError, apiSuccess } from "@/lib/api/response";
import { checkRateLimit, getClientIp } from "@/lib/server/rate-limit";
import { SESSION_COOKIE, verifySiweAndCreateToken } from "@/server/api/auth";

const verifySchema = z.object({
  message: z.string().min(10),
  signature: z.string().min(10)
});

export async function POST(request: Request) {
  try {
    const rate = checkRateLimit(`verify:${getClientIp(request)}`, 10);
    if (!rate.allowed) return apiError("RATE_LIMITED", "Too many verification attempts", 429);

    const parsed = verifySchema.safeParse(await request.json().catch(() => ({})));
    if (!parsed.success) return apiError("INVALID_INPUT", "Invalid signature payload", 422, parsed.error.flatten());

    const token = await verifySiweAndCreateToken(parsed.data.message, parsed.data.signature);
    const cookieStore = await cookies();
    cookieStore.set(SESSION_COOKIE, token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 7
    });
    return apiSuccess({ authenticated: true });
  } catch (error) {
    return apiError("AUTH_FAILED", error instanceof Error ? error.message : "Authentication failed", 401);
  }
}
