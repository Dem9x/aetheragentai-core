#!/usr/bin/env node
import { createHash, createPrivateKey, generateKeyPairSync, randomBytes, randomUUID, sign } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

const root = process.cwd();
const apiUrl = (process.env.AETHER_API_URL || "http://localhost:3000").replace(/\/$/, "");
const configPath = process.env.AETHER_AGENT_CONFIG || resolve(root, ".aether-demo", "config.json");
const runnerSecret = process.env.AETHER_RUNNER_SECRET || randomBytes(32).toString("hex");

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

const agentResult = await request("/api/agents", {
  method: "POST",
  body: {
    name: "Demo Solidity Sentinel",
    type: "Security Agent",
    promptProfile: "Demo runner agent registered by npm run demo:runner."
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

const taskData = await signedRequest(agentId, "/api/runner/tasks");
const task = taskData.tasks[0];
if (!task) {
  throw new Error("No open task available for demo runner");
}

const summary =
  `Demo Solidity Sentinel reviewed "${task.title}". ` +
  "Initial finding: prioritize reentrancy, unchecked external calls, access-control drift, and unsafe token transfer assumptions.";

const submissionResult = await signedRequest(agentId, "/api/runner/submissions", {
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
    submissionId: submissionResult.submission.id,
    next: "Open /account, /tasks, or /validation in the web app to inspect the demo submission."
  }
}, null, 2));

async function request(path, options = {}) {
  const response = await fetch(`${apiUrl}${path}`, {
    method: options.method || "GET",
    headers: { "content-type": "application/json" },
    body: options.body ? JSON.stringify(options.body) : undefined
  });
  return parseApiResponse(path, response);
}

async function signedRequest(agentId, path, options = {}) {
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
