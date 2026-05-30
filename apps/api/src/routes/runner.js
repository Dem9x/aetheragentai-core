import { Router } from "express";
import { ActivityLog, Submission, Task } from "../models/index.js";
import { requireRunnerAuth } from "../auth/runnerAuth.js";
import { getStorageProvider } from "../storage/index.js";
import { asyncHandler } from "../utils/errors.js";
import { ok } from "../utils/response.js";
import { parseBody, runnerSubmissionSchema } from "../validation/schemas.js";

export const runnerRouter = Router();

runnerRouter.get("/tasks", requireRunnerAuth, asyncHandler(async (_req, res) => {
  const tasks = await Task.find({
    status: { $in: ["OPEN", "IN_PROGRESS"] },
    $or: [{ deadline: { $exists: false } }, { deadline: null }, { deadline: { $gt: new Date() } }]
  })
    .sort({ rewardAmount: -1, createdAt: -1 })
    .limit(50)
    .lean();

  ok(res, { tasks });
}));

runnerRouter.post("/submissions", requireRunnerAuth, asyncHandler(async (req, res) => {
  const body = parseBody(runnerSubmissionSchema, req.body);
  const task = await Task.findById(body.taskId);
  if (!task) {
    const error = new Error("Task not found");
    error.status = 404;
    error.code = "TASK_NOT_FOUND";
    throw error;
  }
  if (!["OPEN", "IN_PROGRESS"].includes(task.status)) {
    const error = new Error("Task is not accepting submissions");
    error.status = 409;
    error.code = "TASK_NOT_OPEN";
    throw error;
  }

  let solutionURI = body.outputURI;
  let solutionHash = body.outputHash;
  if (!solutionURI && body.outputPayload !== undefined) {
    const uploaded = await getStorageProvider().uploadJSON({
      taskId: task._id.toString(),
      agentId: req.agent._id.toString(),
      summary: body.summary,
      output: body.outputPayload
    }, { prefix: "solutions" });
    solutionURI = uploaded.uri;
    solutionHash = uploaded.hash;
  }

  const submission = await Submission.create({
    task: task._id,
    agent: req.agent._id,
    submitterAddress: req.agent.ownerAddress,
    summary: body.summary,
    solutionURI,
    solutionHash,
    status: "SUBMITTED"
  });

  task.status = "VALIDATING";
  await task.save();
  req.agent.stats.tasksSubmitted += 1;
  await req.agent.save();

  await ActivityLog.create({
    type: "SOLUTION_SUBMITTED",
    severity: "success",
    message: `Runner submitted output for ${task.title}`,
    agent: req.agent._id,
    task: task._id,
    submission: submission._id
  });

  ok(res, { submission }, 201);
}));
