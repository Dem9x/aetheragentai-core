import { apiSuccess } from "@/lib/api/response";
import { prisma } from "@/lib/server/prisma";

export async function GET() {
  const [agents, tasks, submissions, validations, rewards] = await Promise.all([
    prisma.agent.count(),
    prisma.task.count(),
    prisma.submission.count(),
    prisma.validation.count(),
    prisma.reward.aggregate({ _sum: { amount: true } })
  ]);

  return apiSuccess({
    agents,
    tasks,
    submissions,
    validations,
    rewardsAllocated: rewards._sum.amount?.toString() ?? "0",
    safety: "testnet only until audited"
  });
}
