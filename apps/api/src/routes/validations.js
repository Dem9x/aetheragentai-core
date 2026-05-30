import { Router } from "express";
import { ActivityLog, Reward, Submission, Task, Validation } from "../models/index.js";
import { config, isProductionLike } from "../config.js";
import { getStorageProvider } from "../storage/index.js";
import { ApiError, asyncHandler } from "../utils/errors.js";
import { ok } from "../utils/response.js";
import { parseBody, validationSchema } from "../validation/schemas.js";

export const validationsRouter = Router();

function requireValidator(req) {
  if (isProductionLike()) {
    throw new ApiError(
      501,
      "VALIDATOR_AUTH_NOT_CONFIGURED",
      "Production validator auth is not mocked. Use a signed validator/admin session before public testnet."
    );
  }
  const address = req.get("x-dev-validator-address") || req.body?.validatorAddress;
  if (!address) throw new ApiError(401, "DEV_VALIDATOR_REQUIRED", "Set x-dev-validator-address for local validation.");
  if (config.env === "production") throw new ApiError(401, "DEV_VALIDATOR_DISABLED", "Dev validator auth is disabled in production.");
  return address.toLowerCase();
}

validationsRouter.get("/queue", asyncHandler(async (_req, res) => {
  const submissions = await Submission.find({ status: { $in: ["SUBMITTED", "VALIDATING", "VALIDATED"] } })
    .sort({ createdAt: -1 })
    .limit(100)
    .populate("task")
    .populate("agent")
    .lean();
  const validations = await Validation.find({ submission: { $in: submissions.map((item) => item._id) } }).sort({ createdAt: -1 }).lean();
  const validationsBySubmission = new Map();
  for (const validation of validations) {
    const key = String(validation.submission);
    validationsBySubmission.set(key, [...(validationsBySubmission.get(key) ?? []), validation]);
  }

  const [pendingSubmissions, totalValidations, finalizedTasks, claimableRewards] = await Promise.all([
    Submission.countDocuments({ status: { $in: ["SUBMITTED", "VALIDATING"] } }),
    Validation.countDocuments(),
    Task.countDocuments({ status: { $in: ["VALIDATED", "REWARDED"] } }),
    Reward.countDocuments({ status: "CLAIMABLE" })
  ]);

  ok(res, {
    access: { address: "dev-validator", isValidator: true, isAdmin: false },
    stats: { pendingSubmissions, totalValidations, finalizedTasks, claimableRewards },
    submissions: submissions.map((submission) => {
      const task = submission.task ?? {};
      const agent = submission.agent ?? {};
      return {
        id: String(submission._id),
        chainSubmissionId: submission.chainSubmissionId ?? null,
        taskId: String(task._id ?? submission.task),
        chainTaskId: task.chainTaskId ?? null,
        taskTitle: task.title ?? "Task",
        taskRewardAmount: String(task.rewardAmount ?? 0),
        taskPassingScore: task.passingScore ?? 80,
        requiredValidatorQuorum: task.requiredValidatorQuorum ?? 3,
        taskValidationStatus: task.status ?? "VALIDATING",
        taskSettlementStatus: task.settlementStatus ?? "NOT_READY",
        agentId: agent._id ? String(agent._id) : String(submission.agent),
        agentName: agent.name ?? null,
        submitterAddress: submission.submitterAddress,
        solutionURI: submission.solutionURI,
        solutionHash: submission.solutionHash,
        status: submission.status,
        poiScore: submission.poiScore != null ? String(submission.poiScore) : null,
        createdAt: submission.createdAt,
        validations: (validationsBySubmission.get(String(submission._id)) ?? []).map((validation) => ({
          id: String(validation._id),
          validatorAddress: validation.validatorAddress,
          score: validation.score,
          confidence: validation.confidence,
          resultURI: validation.resultURI,
          finalized: validation.finalized,
          createdAt: validation.createdAt
        }))
      };
    }),
    safety: "AI validation can be imperfect. Rewards are protocol-based and not guaranteed."
  });
}));

validationsRouter.post("/", asyncHandler(async (req, res) => {
  const validatorAddress = requireValidator(req);
  const body = parseBody(validationSchema, req.body);
  const submission = await Submission.findById(body.submissionId);
  if (!submission) throw new ApiError(404, "SUBMISSION_NOT_FOUND", "Submission not found.");
  const task = await Task.findById(submission.task);
  if (!task) throw new ApiError(404, "TASK_NOT_FOUND", "Task not found.");

  let resultURI = body.resultURI;
  let resultHash = body.resultHash;
  if (!resultURI && body.resultPayload !== undefined) {
    const uploaded = await getStorageProvider().uploadJSON({
      submissionId: submission._id.toString(),
      taskId: task._id.toString(),
      validatorAddress,
      score: body.score,
      confidence: body.confidence,
      reason: body.reason,
      result: body.resultPayload
    }, { prefix: "validations" });
    resultURI = uploaded.uri;
    resultHash = uploaded.hash;
  }

  const validation = await Validation.create({
    task: task._id,
    submission: submission._id,
    validatorAddress,
    score: body.score,
    confidence: body.confidence,
    reason: body.reason,
    resultURI,
    resultHash
  });

  const validations = await Validation.find({ submission: submission._id }).lean();
  const avgScore = validations.reduce((sum, item) => sum + item.score, 0) / validations.length;
  const avgConfidence = validations.reduce((sum, item) => sum + item.confidence, 0) / validations.length;
  const quorumMet = validations.length >= task.requiredValidatorQuorum;
  const passing = avgScore >= task.passingScore;

  submission.status = quorumMet ? (passing ? "VALIDATED" : "REJECTED") : "VALIDATING";
  submission.poiScore = Math.round(avgScore * 100) / 100;
  submission.validationConfidence = Math.round(avgConfidence * 100) / 100;
  await submission.save();

  task.status = quorumMet ? (passing ? "VALIDATED" : "REJECTED") : "VALIDATING";
  task.settlementStatus = quorumMet && passing ? "READY" : "NOT_READY";
  if (quorumMet && passing) task.solvedAt = new Date();
  await task.save();

  if (quorumMet) {
    await Validation.updateMany({ submission: submission._id }, { $set: { finalized: true } });
  }

  await ActivityLog.create({
    type: "VALIDATION_SUBMITTED",
    severity: quorumMet ? "success" : "info",
    message: `Validation submitted with score ${body.score}`,
    task: task._id,
    submission: submission._id,
    metadata: { quorumMet, avgScore, avgConfidence }
  });

  ok(res, { validation, quorumMet, avgScore, avgConfidence, submissionStatus: submission.status }, 201);
}));
