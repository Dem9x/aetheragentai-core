import { apiError, apiSuccess } from "@/lib/api/response";
import { calculateReward } from "@/lib/rewards";
import { readData } from "@/lib/server/datastore";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await readData();
  const task = data.tasks.find((item) => item.id === id);
  if (!task) return apiError("TASK_NOT_FOUND", "Task not found", 404, { id });
  return apiSuccess({
    task,
    submissions: data.submissions.filter((submission) => submission.taskId === id),
    rewardSimulation: calculateReward({
      baseReward: task.rewardAAA,
      complexityMultiplier: task.complexityScore / 70,
      validationConfidence: task.confidenceTarget,
      reputationMultiplier: 1.12
    })
  });
}
