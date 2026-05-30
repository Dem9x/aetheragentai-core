import { Router } from "express";
import { Agent, AgentIntegration, ActivityLog } from "../models/index.js";
import { assertAgentOwner, requireDevOwner } from "../auth/ownerAuth.js";
import { asyncHandler } from "../utils/errors.js";
import { canonicalJson, sha256Hex } from "../utils/hash.js";
import { ok } from "../utils/response.js";
import { hashSecret } from "../utils/secret.js";
import { getStorageProvider } from "../storage/index.js";
import { createAgentSchema, integrationSchema, parseBody } from "../validation/schemas.js";

export const agentsRouter = Router();

agentsRouter.post("/", asyncHandler(async (req, res) => {
  const ownerAddress = requireDevOwner(req);
  const body = parseBody(createAgentSchema, req.body);
  let metadataURI = body.metadataURI;
  let metadataHash = body.metadataHash;

  if (!metadataURI && body.metadata) {
    const uploaded = await getStorageProvider().uploadJSON(body.metadata, { prefix: "agent-metadata" });
    metadataURI = uploaded.uri;
    metadataHash = uploaded.hash;
  } else if (body.metadata && !metadataHash) {
    metadataHash = sha256Hex(canonicalJson(body.metadata));
  }

  const agent = await Agent.create({
    ownerAddress,
    name: body.name,
    description: body.description,
    agentType: body.agentType,
    metadataURI,
    metadataHash
  });

  await ActivityLog.create({
    type: "AGENT_REGISTERED",
    severity: "success",
    message: `Agent registered: ${agent.name}`,
    agent: agent._id,
    metadata: { ownerAddress }
  });

  ok(res, { agent }, 201);
}));

agentsRouter.get("/", asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.ownerAddress) filter.ownerAddress = String(req.query.ownerAddress).toLowerCase();
  if (req.query.status === "active") filter.active = true;
  const agents = await Agent.find(filter).sort({ createdAt: -1 }).limit(100).lean();
  ok(res, { agents });
}));

agentsRouter.get("/:id", asyncHandler(async (req, res) => {
  const agent = await Agent.findById(req.params.id).lean();
  if (!agent) {
    const error = new Error("Agent not found");
    error.status = 404;
    error.code = "AGENT_NOT_FOUND";
    throw error;
  }
  const integration = await AgentIntegration.findOne({ agent: agent._id }).lean();
  ok(res, { agent, integration: integration ? { ...integration, webhookSecretHash: undefined } : null });
}));

agentsRouter.get("/:id/integration", asyncHandler(async (req, res) => {
  const ownerAddress = requireDevOwner(req);
  const agent = await Agent.findById(req.params.id);
  assertAgentOwner(agent, ownerAddress);
  const integration = await AgentIntegration.findOne({ agent: agent._id }).lean();
  ok(res, { integration: integration ? { ...integration, webhookSecretHash: undefined } : null });
}));

agentsRouter.post("/:id/integration", asyncHandler(async (req, res) => {
  const ownerAddress = requireDevOwner(req);
  const agent = await Agent.findById(req.params.id);
  assertAgentOwner(agent, ownerAddress);
  const body = parseBody(integrationSchema, req.body);

  const update = {
    runtimeType: body.runtimeType,
    agentEndpoint: body.agentEndpoint || "",
    publicKey: body.publicKey || "",
    capabilities: body.capabilities,
    status: body.status,
    lastCheckedAt: new Date()
  };

  if (body.runnerSecret) update.webhookSecretHash = hashSecret(body.runnerSecret);

  const integration = await AgentIntegration.findOneAndUpdate(
    { agent: agent._id },
    { $set: update },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  ).lean();

  await ActivityLog.create({
    type: "AGENT_INTEGRATION_UPDATED",
    severity: "info",
    message: `Integration updated for ${agent.name}`,
    agent: agent._id,
    metadata: { signedAuthReady: Boolean(integration.publicKey) }
  });

  ok(res, { integration: { ...integration, webhookSecretHash: undefined } });
}));
