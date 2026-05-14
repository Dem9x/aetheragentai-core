import { apiSuccess } from "@/lib/api/response";
import { listAgents } from "@/lib/server/core-data";

export async function GET() {
  const agents = await listAgents().catch(() => []);
  return apiSuccess({
    leaderboard: agents
      .sort((a, b) => b.poiScore - a.poiScore)
      .map((agent, index) => ({
        rank: index + 1,
        name: agent.name,
        type: agent.type,
        poiScore: agent.poiScore,
        reputation: agent.reputation,
        aaaEarned: agent.totalRewards,
        solvedTasks: agent.solvedTasks,
        validationConfidence: agent.validationScore,
        trend: "flat"
      }))
  });
}
