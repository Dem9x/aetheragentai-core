import { apiError, apiSuccess } from "@/lib/api/response";
import { calculateReward } from "@/lib/rewards";
import { getTaskWithSubmissions } from "@/lib/server/core-data";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const record = await getTaskWithSubmissions(id);
    if (!record) return apiError("TASK_NOT_FOUND", "Task not found", 404, { id });
    return apiSuccess({
      task: record.task,
      submissions: record.submissions,
      rewardSimulation: calculateReward({
        baseReward: record.task.rewardAAA,
        complexityMultiplier: record.task.complexityScore / 70,
        validationConfidence: record.task.confidenceTarget,
        reputationMultiplier: 1.12
      })
    });
  } catch (error) {
    return apiError("TASK_UNAVAILABLE", error instanceof Error ? error.message : "Unable to load task", 503);
  }
}
