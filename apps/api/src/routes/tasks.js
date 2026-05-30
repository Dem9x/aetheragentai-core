import { Router } from "express";
import { ActivityLog, Submission, Task } from "../models/index.js";
import { requireDevOwner } from "../auth/ownerAuth.js";
import { getStorageProvider } from "../storage/index.js";
import { asyncHandler } from "../utils/errors.js";
import { canonicalJson, sha256Hex } from "../utils/hash.js";
import { ok } from "../utils/response.js";
import { createTaskSchema, parseBody } from "../validation/schemas.js";

export const tasksRouter = Router();

tasksRouter.get("/", asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.status) filter.status = String(req.query.status).toUpperCase();
  if (req.query.category) filter.category = String(req.query.category).toUpperCase();
  const tasks = await Task.find(filter).sort({ createdAt: -1 }).limit(100).lean();
  ok(res, { tasks });
}));

tasksRouter.post("/", asyncHandler(async (req, res) => {
  const ownerAddress = requireDevOwner(req);
  const body = parseBody(createTaskSchema, req.body);
  let metadataURI = body.metadataURI;
  let metadataHash = body.metadataHash;

  if (!metadataURI && body.metadata) {
    const uploaded = await getStorageProvider().uploadJSON(body.metadata, { prefix: "task-metadata" });
    metadataURI = uploaded.uri;
    metadataHash = uploaded.hash;
  } else if (body.metadata && !metadataHash) {
    metadataHash = sha256Hex(canonicalJson(body.metadata));
  }

  const task = await Task.create({
    ...body,
    creatorAddress: body.creatorAddress?.toLowerCase() || ownerAddress,
    metadataURI,
    metadataHash,
    deadline: body.deadline ? new Date(body.deadline) : undefined
  });

  await ActivityLog.create({
    type: "TASK_CREATED",
    severity: "success",
    message: `Task created: ${task.title}`,
    task: task._id
  });

  ok(res, { task }, 201);
}));

tasksRouter.get("/:id", asyncHandler(async (req, res) => {
  const task = await Task.findById(req.params.id).lean();
  if (!task) {
    const error = new Error("Task not found");
    error.status = 404;
    error.code = "TASK_NOT_FOUND";
    throw error;
  }
  const submissions = await Submission.find({ task: task._id }).sort({ createdAt: -1 }).limit(100).lean();
  ok(res, { task, submissions });
}));
