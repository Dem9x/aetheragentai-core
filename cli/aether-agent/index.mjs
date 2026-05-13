#!/usr/bin/env node
import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";

const VERSION = "0.1.0";
const CONFIG_PATH = process.env.AETHER_AGENT_CONFIG || join(homedir(), ".aether-agent", "config.json");

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
  const apiUrl = (options.apiUrl || config.apiUrl || process.env.AETHER_API_URL || "http://localhost:3000").replace(/\/$/, "");
  const headers = {
    "content-type": "application/json",
    ...(options.headers ?? {})
  };
  const response = await fetch(`${apiUrl}${path}`, {
    method: options.method ?? "GET",
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined
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
  aether-agent doctor [--json]
  aether-agent login
  aether-agent register --name "Solidity Sentinel" --secret your-secret [--runtime LOCAL_RUNNER]
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
    if (command === "init") {
      const next = {
        ...config,
        apiUrl: args["api-url"] ?? config.apiUrl ?? "http://localhost:3000",
        agentId: args["agent-id"] ?? config.agentId,
        runnerSecret: args["runner-secret"] ?? config.runnerSecret,
        runCommand: args["run-command"] ?? config.runCommand
      };
      saveConfig(next);
      output(args, {
        ok: true,
        message: `Saved config to ${CONFIG_PATH}`,
        data: { ...next, runnerSecret: mask(next.runnerSecret) }
      });
      return;
    }

    if (command === "doctor") {
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
          runnerSecretConfigured: Boolean(config.runnerSecret),
          runCommandConfigured: Boolean(config.runCommand),
          health
        }
      });
      return;
    }

    if (command === "login") {
      output(args, {
        ok: true,
        message: "Wallet SIWE login is browser-based for now. Use the web app /account to sign in; CLI runner authenticates with x-agent-id + x-runner-secret."
      });
      return;
    }

    if (command === "register") {
      const name = args.name;
      if (!name) fail(args, "MISSING_NAME", "--name is required");
      const secret = args.secret ?? config.runnerSecret;
      if (!secret) fail(args, "MISSING_SECRET", "--secret or config runnerSecret is required");
      const agentResult = await request(config, "/api/agents", {
        method: "POST",
        body: {
          name,
          type: args.type ?? "Autonomous Web3 Agent",
          promptProfile: "User-owned agent registered through Aether Agent Runner."
        }
      });
      const agentId = agentResult.agent.id;
      const integration = await request(config, `/api/agents/${agentId}/integration`, {
        method: "POST",
        body: {
          runtimeType: args.runtime ?? "LOCAL_RUNNER",
          agentEndpoint: args.endpoint ?? "",
          publicKey: args["public-key"] ?? "",
          webhookSecret: secret,
          capabilities: String(args.capabilities ?? "solidity,audit,research").split(",").map((item) => item.trim()).filter(Boolean)
        }
      });
      saveConfig({ ...config, agentId, runnerSecret: secret });
      output(args, {
        ok: true,
        data: { agent: agentResult.agent, integration: integration.integration, configPath: CONFIG_PATH }
      });
      return;
    }

    if (command === "tasks") {
      const agentId = args["agent-id"] ?? config.agentId;
      const secret = args["runner-secret"] ?? config.runnerSecret;
      if (!agentId) fail(args, "MISSING_AGENT_ID", "--agent-id or config agentId is required");
      const data = await request(config, "/api/runner/tasks", {
        headers: { "x-agent-id": agentId, "x-runner-secret": secret ?? "" }
      });
      output(args, { ok: true, data });
      return;
    }

    if (command === "submit") {
      const taskId = args["task-id"];
      const agentId = args["agent-id"] ?? config.agentId;
      const summary = args.summary;
      const secret = args["runner-secret"] ?? config.runnerSecret;
      if (!taskId || !agentId || !summary) fail(args, "MISSING_SUBMIT_FIELDS", "--task-id, --agent-id/config, and --summary are required");
      const data = await request(config, "/api/runner/submissions", {
        method: "POST",
        headers: { "x-runner-secret": secret ?? "" },
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
      const secret = args["runner-secret"] ?? config.runnerSecret;
      if (!agentId) fail(args, "MISSING_AGENT_ID", "--agent-id or config agentId is required");
      if (!config.runCommand && !args["run-command"] && !args["dry-run"]) {
        fail(args, "MISSING_RUN_COMMAND", "--run-command or config runCommand is required, unless --dry-run is used");
      }
      const taskData = await request(config, "/api/runner/tasks", {
        headers: { "x-agent-id": agentId, "x-runner-secret": secret ?? "" }
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
          headers: { "x-runner-secret": secret ?? "" },
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
