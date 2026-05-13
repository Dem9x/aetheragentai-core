import { apiError, apiSuccess } from "@/lib/api/response";
import { prisma } from "@/lib/server/prisma";
import { addressSchema } from "@/server/api/schemas";

export async function GET(_: Request, { params }: { params: Promise<{ address: string }> }) {
  const { address } = await params;
  const parsed = addressSchema.safeParse(address);
  if (!parsed.success) return apiError("INVALID_ADDRESS", "Invalid EVM address", 422);

  const rewards = await prisma.reward.findMany({
    where: { recipientAddress: address.toLowerCase() },
    orderBy: { createdAt: "desc" }
  });

  return apiSuccess({ rewards, disclaimer: "rewards are protocol-based and not guaranteed" });
}
