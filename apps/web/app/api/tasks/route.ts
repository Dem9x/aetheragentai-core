import { apiError, apiSuccess } from "@/lib/api/response";
import { listTasks } from "@/lib/server/core-data";

export async function GET() {
  try {
    const tasks = await listTasks();
    return apiSuccess({ tasks });
  } catch (error) {
    return apiError("TASKS_UNAVAILABLE", error instanceof Error ? error.message : "Unable to load tasks", 503);
  }
}
