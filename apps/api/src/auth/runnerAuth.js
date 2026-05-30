import { createPublicKey, verify } from "node:crypto";
import { config, isProductionLike } from "../config.js";
import { Agent, AgentIntegration, RunnerNonce } from "../models/index.js";
import { ApiError } from "../utils/errors.js";
import { sha256Hex } from "../utils/hash.js";
import { verifySecret } from "../utils/secret.js";

export function runnerSignaturePayload(method, path, timestamp, nonce, bodyHash) {
  return [method.toUpperCase(), path, timestamp, nonce, bodyHash].join("\n");
}

async function rememberNonce(agentId, nonce) {
  try {
    await RunnerNonce.create({
      agentId,
      nonce,
      expiresAt: new Date(Date.now() + config.runnerMaxSkewSeconds * 1000)
    });
    return true;
  } catch (error) {
    if (error?.code === 11000) return false;
    throw error;
  }
}

export async function requireRunnerAuth(req, _res, next) {
  try {
    const agentId = req.get("x-agent-id");
    if (!agentId) throw new ApiError(401, "RUNNER_AGENT_ID_REQUIRED", "x-agent-id header is required.");

    const agent = await Agent.findById(agentId);
    if (!agent) throw new ApiError(404, "AGENT_NOT_FOUND", "Agent not found.");
    if (!agent.active) throw new ApiError(403, "AGENT_INACTIVE", "Agent is inactive.");

    const integration = await AgentIntegration.findOne({ agent: agent._id });
    if (!integration) throw new ApiError(404, "INTEGRATION_NOT_FOUND", "Agent integration is not configured.");
    if (integration.status !== "ACTIVE") {
      throw new ApiError(403, "RUNNER_INACTIVE", "Agent integration is not active.");
    }

    const timestamp = req.get("x-runner-timestamp") || "";
    const nonce = req.get("x-runner-nonce") || "";
    const signature = req.get("x-runner-signature") || "";
    const bodyHash = sha256Hex(req.rawBody || "");

    if (integration.publicKey) {
      const issuedAt = Number(timestamp);
      const maxSkewMs = config.runnerMaxSkewSeconds * 1000;
      if (!timestamp || !Number.isFinite(issuedAt) || Math.abs(Date.now() - issuedAt) > maxSkewMs) {
        throw new ApiError(401, "INVALID_RUNNER_TIMESTAMP", "Runner timestamp is missing, invalid, or expired.");
      }
      if (!nonce || !(await rememberNonce(agentId, nonce))) {
        throw new ApiError(401, "INVALID_RUNNER_NONCE", "Runner nonce is missing or already used.");
      }
      if (!signature) {
        throw new ApiError(401, "RUNNER_SIGNATURE_REQUIRED", "x-runner-signature header is required.");
      }

      const requestPath = new URL(req.originalUrl, "http://aether.local").pathname;
      const payload = runnerSignaturePayload(req.method, requestPath, timestamp, nonce, bodyHash);
      const valid = verify(null, Buffer.from(payload), createPublicKey(integration.publicKey), Buffer.from(signature, "base64"));
      if (!valid) throw new ApiError(401, "INVALID_RUNNER_SIGNATURE", "Runner signature verification failed.");

      req.agent = agent;
      req.agentIntegration = integration;
      return next();
    }

    if (isProductionLike() && !config.allowLegacyRunnerSecret) {
      throw new ApiError(401, "RUNNER_PUBLIC_KEY_REQUIRED", "Public/testnet runners require signed requests with a registered public key.");
    }
    if (config.allowLegacyRunnerSecret) {
      console.warn("AETHER_ALLOW_LEGACY_RUNNER_SECRET=true is enabled. This fallback is dev-only and should not be used for public testnet.");
    }

    const runnerSecret = req.get("x-runner-secret") || "";
    if (!integration.webhookSecretHash || !verifySecret(runnerSecret, integration.webhookSecretHash)) {
      throw new ApiError(401, "INVALID_RUNNER_SECRET", "Legacy runner secret verification failed.");
    }

    req.agent = agent;
    req.agentIntegration = integration;
    return next();
  } catch (error) {
    return next(error);
  }
}
