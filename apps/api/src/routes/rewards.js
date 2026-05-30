import { Router } from "express";
import { ActivityLog, Reward, Submission, Task } from "../models/index.js";
import { config, isProductionLike } from "../config.js";
import { ApiError, asyncHandler } from "../utils/errors.js";
import { ok } from "../utils/response.js";
import { finalizeRewardSchema, parseBody } from "../validation/schemas.js";

export const rewardsRouter = Router();

function requireFinalizer(req) {
  if (isProductionLike()) {
    throw new ApiError(
      501,
      "FINALIZER_AUTH_NOT_CONFIGURED",
      "Production reward finalization must use a trusted validator/admin signer or multisig; dev bypass is disabled."
    );
  }
  const address = req.get("x-dev-finalizer-address") || req.body?.finalizerAddress;
  if (!address) throw new ApiError(401, "DEV_FINALIZER_REQUIRED", "Set x-dev-finalizer-address for local reward finalization.");
  if (config.env === "production") throw new ApiError(401, "DEV_FINALIZER_DISABLED", "Dev finalizer auth is disabled in production.");
  return address.toLowerCase();
}

rewardsRouter.get("/", asyncHandler(async (_req, res) => {
  const rewards = await Reward.find().sort({ createdAt: -1 }).limit(100).lean();
  ok(res, { rewards, disclaimer: "rewards are protocol-based and not guaranteed" });
}));

rewardsRouter.post("/finalize", asyncHandler(async (req, res) => {
  const finalizerAddress = requireFinalizer(req);
  const body = parseBody(finalizeRewardSchema, req.body);
  const submission = await Submission.findById(body.submissionId).populate("agent");
  if (!submission) throw new ApiError(404, "SUBMISSION_NOT_FOUND", "Submission not found.");
  const task = await Task.findById(submission.task);
  if (!task) throw new ApiError(404, "TASK_NOT_FOUND", "Task not found.");
  if (submission.status !== "VALIDATED" || task.settlementStatus !== "READY") {
    throw new ApiError(409, "REWARD_NOT_READY", "Submission must be validated and ready before reward finalization.");
  }

  const amount = body.amount ?? task.rewardAmount;
  const reward = await Reward.create({
    task: task._id,
    submission: submission._id,
    recipientAddress: submission.submitterAddress,
    amount,
    status: "CLAIMABLE"
  });

  submission.status = "REWARDED";
  task.status = "REWARDED";
  task.settlementStatus = "FINALIZED";
  task.finalizedBy = finalizerAddress;
  await submission.save();
  await task.save();

  await ActivityLog.create({
    type: "REWARD_FINALIZED",
    severity: "success",
    message: `Reward finalized for submission ${submission._id}`,
    task: task._id,
    submission: submission._id,
    metadata: { finalizerAddress, amount, note: "rewards are protocol-based and not guaranteed" }
  });

  ok(res, { reward }, 201);
}));

rewardsRouter.get("/:address", asyncHandler(async (req, res) => {
  const address = String(req.params.address || "").toLowerCase();
  if (!/^0x[a-f0-9]{40}$/.test(address)) {
    throw new ApiError(422, "INVALID_ADDRESS", "Invalid EVM address.");
  }

  const rewards = await Reward.find({ recipientAddress: address }).sort({ createdAt: -1 }).limit(100).lean();
  ok(res, { rewards, disclaimer: "rewards are protocol-based and not guaranteed" });
}));
