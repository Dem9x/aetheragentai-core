#!/usr/bin/env node
import { createHash, createPrivateKey, generateKeyPairSync, randomBytes, randomUUID, sign } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

const root = process.cwd();
const apiUrl = (process.env.AETHER_API_URL || "http://localhost:3000").replace(/\/$/, "");
const configPath = process.env.AETHER_AGENT_CONFIG || resolve(root, ".aether-demo", "config.json");
const runnerSecret = process.env.AETHER_RUNNER_SECRET || randomBytes(32).toString("hex");

try {
  await main();
} catch (error) {
  console.error(JSON.stringify({
    ok: false,
    error: {
      code: "DEMO_RUNNER_FAILED",
      message: error instanceof Error ? error.message : "Demo runner failed"
    }
  }, null, 2));
  process.exitCode = 1;
}

async function main() {
  const { publicKey, privateKey } = generateKeyPairSync("ed25519");
  const publicKeyPem = publicKey.export({ type: "spki", format: "pem" });
  const privateKeyPem = privateKey.export({ type: "pkcs8", format: "pem" });

  mkdirSync(dirname(configPath), { recursive: true });
  writeFileSync(configPath, JSON.stringify({
    apiUrl,
    runnerSecret,
    publicKey: publicKeyPem,
    privateKey: privateKeyPem,
    keyAlgorithm: "ed25519"
  }, null, 2));

  await request("/api/health");

  const agentId = await registerDemoAgent({ publicKeyPem, runnerSecret });

  const taskData = await signedRequest(privateKeyPem, agentId, "/api/runner/tasks");
  const task = taskData.tasks[0] ?? await fallbackTask();

  const summary =
    `Demo Solidity Sentinel reviewed "${task.title}". ` +
    "Initial finding: prioritize reentrancy, unchecked external calls, access-control drift, and unsafe token transfer assumptions.";

  const submissionResult = await signedRequest(privateKeyPem, agentId, "/api/runner/submissions", {
    method: "POST",
    body: {
      taskId: task.taskId,
      agentId,
      summary,
      confidence: 0.82,
      outputHash: sha256Hex(summary)
    }
  });

  const nextConfig = JSON.parse(JSON.stringify({
    apiUrl,
    agentId,
    runnerSecret,
    publicKey: publicKeyPem,
    privateKey: privateKeyPem,
    keyAlgorithm: "ed25519"
  }));
  writeFileSync(configPath, `${JSON.stringify(nextConfig, null, 2)}\n`);

  console.log(JSON.stringify({
    ok: true,
    data: {
      apiUrl,
      configPath,
      agentId,
      taskId: task.taskId,
      taskSource: task.source,
      submissionId: submissionResult.submission.id,
      next: "Open /account, /tasks, or /validation in the web app to inspect the demo submission."
    }
  }, null, 2));
}

async function registerDemoAgent({ publicKeyPem, runnerSecret }) {
  try {
    const agentResult = await request("/api/agents", {
      method: "POST",
      body: {
        name: "Demo Solidity Sentinel",
        type: "Security Agent",
        promptProfile: "Demo runner agent registered by npm run demo:runner.",
        ownerAddress: "0x0000000000000000000000000000000000000000"
      }
    });
    const agentId = agentResult.agent.id;
    await request(`/api/agents/${agentId}/integration`, {
      method: "POST",
      body: {
        runtimeType: "LOCAL_RUNNER",
        agentEndpoint: "",
        publicKey: publicKeyPem,
        webhookSecret: runnerSecret,
        capabilities: ["solidity", "audit", "security", "web3"]
      }
    });
    return agentId;
  } catch {
    return registerDemoAgentDirectly({ publicKeyPem, runnerSecret });
  }
}

async function registerDemoAgentDirectly({ publicKeyPem, runnerSecret }) {
  const { PrismaClient } = await import("@prisma/client");
  const prisma = new PrismaClient();
  try {
    const metadata = {
      name: "Demo Solidity Sentinel",
      agentType: "Security Agent",
      description: "Demo runner agent registered locally by npm run demo:runner.",
      version: "1.0.0"
    };
    const metadataHash = sha256Hex(JSON.stringify(metadata));
    const agent = await prisma.agent.create({
      data: {
        ownerAddress: "0x0000000000000000000000000000000000000000",
        metadataURI: `local://demo-agent/${metadataHash}`,
        metadataHash,
        name: metadata.name,
        agentType: metadata.agentType,
        active: true,
        stats: { create: {} }
      }
    });
    await prisma.agentIntegration.create({
      data: {
        agentId: agent.id,
        runtimeType: "LOCAL_RUNNER",
        publicKey: publicKeyPem,
        webhookSecretHash: `sha256:${createHash("sha256").update(runnerSecret).digest("hex")}`,
        capabilities: ["solidity", "audit", "security", "web3"],
        status: "ACTIVE",
        lastCheckedAt: new Date()
      }
    });
    await prisma.activityLog.create({
      data: { type: "AGENT_REGISTERED", severity: "success", message: `Demo agent registered: ${agent.name}` }
    });
    return agent.id;
  } finally {
    await prisma.$disconnect();
  }
}

async function request(path, options = {}) {
  const response = await fetch(`${apiUrl}${path}`, {
    method: options.method || "GET",
    headers: { "content-type": "application/json" },
    body: options.body ? JSON.stringify(options.body) : undefined
  });
  return parseApiResponse(path, response);
}

async function fallbackTask() {
  const taskData = await request("/api/tasks");
  const task = taskData.tasks?.[0];
  if (!task) throw new Error("No task available for demo runner. Seed or create a task first.");
  return {
    taskId: task.id,
    title: task.title,
    source: "fallback:/api/tasks"
  };
}

async function signedRequest(privateKeyPem, agentId, path, options = {}) {
  const method = options.method || "GET";
  const bodyText = options.body ? JSON.stringify(options.body) : "";
  const timestamp = String(Date.now());
  const nonce = randomUUID();
  const payload = [method, path, timestamp, nonce, sha256Hex(bodyText)].join("\n");
  const signature = sign(null, Buffer.from(payload), createPrivateKey(privateKeyPem)).toString("base64");

  const response = await fetch(`${apiUrl}${path}`, {
    method,
    headers: {
      "content-type": "application/json",
      "x-agent-id": agentId,
      "x-runner-timestamp": timestamp,
      "x-runner-nonce": nonce,
      "x-runner-signature": signature
    },
    body: bodyText || undefined
  });
  return parseApiResponse(path, response);
}

async function parseApiResponse(path, response) {
  const raw = await response.text();
  const payload = raw ? JSON.parse(raw) : null;
  if (!payload?.ok) {
    throw new Error(payload?.error?.message || `Request failed for ${path} (${response.status})`);
  }
  return payload.data;
}

function sha256Hex(text) {
  return `0x${createHash("sha256").update(text).digest("hex")}`;
}
