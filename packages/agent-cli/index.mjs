#!/usr/bin/env node
import { spawn } from "node:child_process";
import { createHash, createPrivateKey, generateKeyPairSync, randomUUID, sign } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";

const VERSION = "0.1.0";
const CONFIG_PATH = process.env.AETHER_AGENT_CONFIG || join(homedir(), ".aether-agent", "config.json");
const KEY_ALGORITHM = "ed25519";

function parseArgs(argv) {
  const args = { _: [] };
  const booleanFlags = new Set(["json", "help", "once", "dry-run"]);
  for (let i = 0; i < argv.length; i++) {
    const item = argv[i];
    if (!item.startsWith("--")) {
      args._.push(item);
      continue;
    }
    const key = item.slice(2);
    if (booleanFlags.has(key)) {
      args[key] = true;
      continue;
    }
    const next = argv[i + 1];
    if (!next || next.startsWith("--")) {
      args[key] = true;
    } else {
      args[key] = next;
      i += 1;
    }
  }
  return args;
}

function mask(value) {
  if (!value) return null;
  if (value.length <= 8) return "***";
  return `${value.slice(0, 4)}...${value.slice(-4)}`;
}

function loadConfig() {
  if (!existsSync(CONFIG_PATH)) return {};
  return JSON.parse(readFileSync(CONFIG_PATH, "utf8"));
}

function saveConfig(config) {
  mkdirSync(dirname(CONFIG_PATH), { recursive: true });
  writeFileSync(CONFIG_PATH, `${JSON.stringify(config, null, 2)}\n`, "utf8");
}

function generateRunnerKeyPair() {
  const { publicKey, privateKey } = generateKeyPairSync(KEY_ALGORITHM);
  return {
    publicKey: publicKey.export({ type: "spki", format: "pem" }),
    privateKey: privateKey.export({ type: "pkcs8", format: "pem" })
  };
}

function pemToEnv(value) {
  return value.replace(/\n/g, "\\n");
}

function output(args, payload) {
  if (args.json) {
    process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`);
    return;
  }
  if (payload.ok === false) {
    process.stderr.write(`ERROR: ${payload.error.message}\n`);
    process.exitCode = payload.error.code ? 1 : 1;
    return;
  }
  process.stdout.write(`${payload.message ?? JSON.stringify(payload.data ?? payload, null, 2)}\n`);
}

function fail(args, code, message, details) {
  const payload = { ok: false, error: { code, message, details } };
  if (args.json) {
    process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`);
  } else {
    process.stderr.write(`ERROR: ${message}\n`);
  }
  process.exit(1);
}

async function request(config, path, options = {}) {
  return runnerFetch(config, options.method ?? "GET", path, options.body, options);
}

function isProductionMode() {
  return process.env.NODE_ENV === "production" || process.env.AETHER_MODE === "production";
}

function hasSignedAuth(config) {
  return Boolean(config.agentId && config.publicKey && config.privateKey);
}

function signRunnerHeaders(config, method, path, bodyText, agentId = config.agentId) {
  if (!config.privateKey || !agentId) return {};
  const timestamp = String(Date.now());
  const nonce = randomUUID();
  const bodyHash = sha256Hex(bodyText || "");
  const payload = [method.toUpperCase(), path, timestamp, nonce, bodyHash].join("\n");
  const signature = sign(null, Buffer.from(payload), createPrivateKey(config.privateKey)).toString("base64");
  return {
    "x-agent-id": agentId,
    "x-runner-timestamp": timestamp,
    "x-runner-nonce": nonce,
    "x-runner-signature": signature
  };
}

async function runnerFetch(config, method, path, body, options = {}) {
  const apiUrl = (options.apiUrl || config.apiUrl || process.env.AETHER_API_URL || "http://localhost:3000").replace(/\/$/, "");
  const bodyText = body ? JSON.stringify(body) : "";
  const agentId = options.agentId ?? config.agentId;
  const signedHeaders = signRunnerHeaders(config, method, path, bodyText, agentId);
  const legacySecret = options.runnerSecret ?? config.runnerSecret;
  const legacyAllowed = !isProductionMode() && !Object.keys(signedHeaders).length && legacySecret;
  if ((path.startsWith("/api/runner/") || path.includes("/integration")) && !Object.keys(signedHeaders).length && !legacyAllowed && isProductionMode()) {
    throw new Error("Production runner requests require privateKey/publicKey signed auth. Run `aether keys generate` and register the public key.");
  }
  const headers = {
    "content-type": "application/json",
    ...signedHeaders,
    ...(legacyAllowed ? { "x-agent-id": agentId ?? "", "x-runner-secret": legacySecret } : {}),
    ...(options.headers ?? {})
  };
  const response = await fetch(`${apiUrl}${path}`, {
    method,
    headers,
    body: bodyText || undefined
  });
  const payload = await response.json().catch(() => ({ ok: false, error: { message: `Non-JSON response ${response.status}` } }));
  if (!payload.ok) {
    throw new Error(payload.error?.message ?? `Request failed with ${response.status}`);
  }
  return payload.data;
}

function help() {
  return `Aether Agent Runner ${VERSION}

Usage:
  aether-agent init --api-url http://localhost:3000 --agent-id agent-orion --runner-secret secret --run-command "node my-agent.js"
  aether-agent setup --api-url http://localhost:3000 --run-command "node my-agent.js"
  aether-agent doctor [--json]
  aether-agent status [--json]
  aether-agent keys generate [--json]
  aether-agent login
  aether-agent register --name "Solidity Sentinel" --owner-address 0x... [--runtime LOCAL_RUNNER]
  aether-agent tasks [--agent-id id] [--json]
  aether-agent run --agent-id id [--once] [--dry-run] [--json]
  aether-agent submit --task-id id --agent-id id --summary "..." [--confidence 0.87]
  aether-agent api GET /api/health [--json]

Config: ${CONFIG_PATH}

Local runner contract:
  Your --run-command receives one task JSON on stdin.
  It must print JSON with: { "summary": "...", "confidence": 0.8, "outputURI": "...", "outputHash": "0x..." }
`;
}

async function runCommand(command, task) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, { shell: true, stdio: ["pipe", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => { stdout += chunk.toString(); });
    child.stderr.on("data", (chunk) => { stderr += chunk.toString(); });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(`agent command exited ${code}: ${stderr.slice(0, 500)}`));
        return;
      }
      try {
        resolve(JSON.parse(stdout));
      } catch {
        reject(new Error("agent command must output JSON"));
      }
    });
    child.stdin.end(JSON.stringify(task));
  });
}

function sha256Hex(text) {
  return `0x${createHash("sha256").update(text).digest("hex")}`;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const command = args._[0];
  const config = loadConfig();

  if (!command || command === "help" || args.help) {
    process.stdout.write(help());
    return;
  }

  try {
    if (command === "init" || command === "setup") {
      const generated = command === "setup" && !config.privateKey ? generateRunnerKeyPair() : null;
      const next = {
        ...config,
        ...(generated ? { publicKey: generated.publicKey, privateKey: generated.privateKey, keyAlgorithm: KEY_ALGORITHM } : {}),
        apiUrl: args["api-url"] ?? config.apiUrl ?? "http://localhost:3000",
        agentId: args["agent-id"] ?? config.agentId,
        runnerSecret: args["runner-secret"] ?? config.runnerSecret,
        runCommand: args["run-command"] ?? config.runCommand
      };
      saveConfig(next);
      output(args, {
        ok: true,
        message: command === "setup"
          ? `Saved config to ${CONFIG_PATH}${generated ? "\nGenerated runner signing keys." : ""}`
          : `Saved config to ${CONFIG_PATH}`,
        data: { ...next, runnerSecret: mask(next.runnerSecret) }
      });
      return;
    }

    if (command === "doctor" || command === "status") {
      let health = null;
      let reachable = false;
      try {
        health = await request(config, "/api/health");
        reachable = true;
      } catch (error) {
        health = { error: error.message };
      }
      output(args, {
        ok: true,
        data: {
          version: VERSION,
          configPath: CONFIG_PATH,
          apiUrl: config.apiUrl ?? process.env.AETHER_API_URL ?? "http://localhost:3000",
          apiReachable: reachable,
          agentIdConfigured: Boolean(config.agentId),
          publicKeyConfigured: Boolean(config.publicKey),
          privateKeyConfigured: Boolean(config.privateKey),
          signedAuthReady: hasSignedAuth(config),
          legacySecretFallbackAvailable: Boolean(config.runnerSecret) && !isProductionMode(),
          legacySecretConfigured: Boolean(config.runnerSecret),
          runCommandConfigured: Boolean(config.runCommand),
          mode: isProductionMode() ? "production" : "development",
          health
        }
      });
      return;
    }

    if (command === "keys") {
      const subcommand = args._[1];
      if (subcommand !== "generate") {
        fail(args, "UNKNOWN_KEYS_COMMAND", "Use: aether keys generate [--json]");
      }
      const keyPair = generateRunnerKeyPair();
      const next = { ...config, publicKey: keyPair.publicKey, privateKey: keyPair.privateKey, keyAlgorithm: KEY_ALGORITHM };
      saveConfig(next);
      output(args, {
        ok: true,
        message:
          `Generated ${KEY_ALGORITHM} runner key pair and saved it to ${CONFIG_PATH}\n` +
          "Add this public key to AETHER_PUBLIC_KEY when registering:\n" +
          `AETHER_PUBLIC_KEY=${pemToEnv(keyPair.publicKey)}`,
        data: {
          algorithm: KEY_ALGORITHM,
          configPath: CONFIG_PATH,
          publicKey: keyPair.publicKey,
          publicKeyEnv: pemToEnv(keyPair.publicKey),
          privateKeySaved: true
        }
      });
      return;
    }

    if (command === "login") {
      output(args, {
        ok: true,
        message: "Wallet SIWE login is browser-based for now. Use /account to sign in. CLI runner requests authenticate with x-agent-id plus Ed25519 signed headers."
      });
      return;
    }

    if (command === "register") {
      const name = args.name;
      if (!name) fail(args, "MISSING_NAME", "--name is required");
      const keys = config.privateKey && config.publicKey ? { publicKey: config.publicKey, privateKey: config.privateKey } : generateRunnerKeyPair();
      const ownerAddress = args["owner-address"] ?? process.env.AETHER_OWNER_ADDRESS;
      if (!ownerAddress) fail(args, "MISSING_OWNER_ADDRESS", "--owner-address or AETHER_OWNER_ADDRESS is required");
      const secret = args.secret ?? config.runnerSecret;
      const agentResult = await request(config, "/api/agents", {
        method: "POST",
        body: {
          name,
          type: args.type ?? "Autonomous Web3 Agent",
          promptProfile: "User-owned agent registered through Aether Agent Runner.",
          ownerAddress
        }
      });
      const agentId = agentResult.agent.id;
      const signedConfig = { ...config, agentId, publicKey: keys.publicKey, privateKey: keys.privateKey };
      const integration = await request(signedConfig, `/api/agents/${agentId}/integration`, {
        method: "POST",
        body: {
          runtimeType: args.runtime ?? "LOCAL_RUNNER",
          agentEndpoint: args.endpoint ?? "",
          publicKey: args["public-key"] ?? process.env.AETHER_PUBLIC_KEY?.replace(/\\n/g, "\n") ?? keys.publicKey,
          webhookSecret: secret ?? "",
          capabilities: String(args.capabilities ?? "solidity,audit,research").split(",").map((item) => item.trim()).filter(Boolean)
        }
      });
      saveConfig({ ...config, agentId, publicKey: keys.publicKey, privateKey: keys.privateKey, keyAlgorithm: KEY_ALGORITHM, ...(secret ? { runnerSecret: secret } : {}) });
      output(args, {
        ok: true,
        data: { agent: agentResult.agent, integration: integration.integration, configPath: CONFIG_PATH }
      });
      return;
    }

    if (command === "tasks") {
      const agentId = args["agent-id"] ?? config.agentId;
      if (!agentId) fail(args, "MISSING_AGENT_ID", "--agent-id or config agentId is required");
      const data = await request(config, "/api/runner/tasks", {
        agentId,
        runnerSecret: args["runner-secret"]
      });
      output(args, { ok: true, data });
      return;
    }

    if (command === "submit") {
      const taskId = args["task-id"];
      const agentId = args["agent-id"] ?? config.agentId;
      const summary = args.summary;
      if (!taskId || !agentId || !summary) fail(args, "MISSING_SUBMIT_FIELDS", "--task-id, --agent-id/config, and --summary are required");
      const data = await request(config, "/api/runner/submissions", {
        method: "POST",
        agentId,
        runnerSecret: args["runner-secret"],
        body: {
          taskId,
          agentId,
          summary,
          confidence: Number(args.confidence ?? 0.8),
          outputURI: args["output-uri"],
          outputHash: args["output-hash"] ?? sha256Hex(summary)
        }
      });
      output(args, { ok: true, data });
      return;
    }

    if (command === "run") {
      const agentId = args["agent-id"] ?? config.agentId;
      if (!agentId) fail(args, "MISSING_AGENT_ID", "--agent-id or config agentId is required");
      if (!config.runCommand && !args["run-command"] && !args["dry-run"]) {
        fail(args, "MISSING_RUN_COMMAND", "--run-command or config runCommand is required, unless --dry-run is used");
      }
      const taskData = await request(config, "/api/runner/tasks", {
        agentId,
        runnerSecret: args["runner-secret"]
      });
      const tasks = args.once ? taskData.tasks.slice(0, 1) : taskData.tasks;
      const results = [];
      for (const task of tasks) {
        const agentOutput = args["dry-run"]
          ? { summary: `Dry-run output for ${task.title}`, confidence: 0.5 }
          : await runCommand(args["run-command"] ?? config.runCommand, task);
        const summary = agentOutput.summary;
        if (!summary) throw new Error("agent output must include summary");
        const submitted = await request(config, "/api/runner/submissions", {
          method: "POST",
          agentId,
          runnerSecret: args["runner-secret"],
          body: {
            taskId: task.taskId,
            agentId,
            summary,
            confidence: Number(agentOutput.confidence ?? 0.8),
            outputURI: agentOutput.outputURI,
            outputHash: agentOutput.outputHash ?? sha256Hex(summary)
          }
        });
        results.push({ taskId: task.taskId, submitted });
      }
      output(args, { ok: true, data: { processed: results.length, results } });
      return;
    }

    if (command === "api") {
      const method = (args._[1] ?? "GET").toUpperCase();
      const path = args._[2];
      if (!path) fail(args, "MISSING_PATH", "api requires METHOD and PATH");
      const data = await request(config, path, { method });
      output(args, { ok: true, data });
      return;
    }

    fail(args, "UNKNOWN_COMMAND", `Unknown command: ${command}`);
  } catch (error) {
    fail(args, "COMMAND_FAILED", error instanceof Error ? error.message : "Command failed");
  }
}

main();
