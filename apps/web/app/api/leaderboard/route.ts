import { apiSuccess } from "@/lib/api/response";
import { listApiAgents } from "@/lib/server/api-data";

export async function GET() {
  const agents = await listApiAgents().catch(() => []);
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
