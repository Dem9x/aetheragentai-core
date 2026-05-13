import { apiSuccess } from "@/lib/api/response";
import { prisma } from "@/lib/server/prisma";

export async function GET() {
  const activity = await prisma.activityLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 100
  });

  return apiSuccess({ activity });
}
