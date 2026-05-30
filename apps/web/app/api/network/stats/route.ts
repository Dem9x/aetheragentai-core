import { apiSuccess } from "@/lib/api/response";
import { getApiNetworkOverview, listApiAgents, listApiRewards, listApiTasks } from "@/lib/server/api-data";

export async function GET() {
  const [overview, agents, tasks, rewards] = await Promise.all([
    getApiNetworkOverview(),
    listApiAgents(),
    listApiTasks(),
    listApiRewards()
  ]);

  return apiSuccess({
    agents: agents.length,
    tasks: tasks.length,
    submissions: tasks.reduce((sum, task) => sum + task.submittedAgents.length, 0),
    validations: tasks.filter((task) => task.validationStatus === "FINALIZED").length,
    rewardsAllocated: rewards.reduce((sum, reward) => sum + reward.amount, 0).toString(),
    overview: overview.stats,
    safety: "testnet only until audited"
  });
}
