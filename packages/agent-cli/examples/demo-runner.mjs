#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { existsSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const cli = join(root, "packages", "agent-cli", "index.mjs");
const sampleAgent = join(root, "packages", "agent-cli", "examples", "solidity-sentinel.mjs");
const apiUrl = process.env.AETHER_API_URL || "http://localhost:3000";
const runnerSecret = process.env.AETHER_RUNNER_SECRET || randomBytes(32).toString("hex");

if (!existsSync(cli)) {
  fail("Run this command from the repository root.");
}

run(["doctor", "--json"], false);
run(["keys", "generate", "--json"]);
run(["init", "--api-url", apiUrl, "--runner-secret", runnerSecret, "--run-command", `node ${sampleAgent}`]);
const registered = run(["register", "--name", "Demo Solidity Sentinel", "--type", "Security Agent", "--secret", runnerSecret, "--json"]);
const agentId = JSON.parse(registered.stdout).data.agent.id;
run(["tasks", "--agent-id", agentId, "--json"]);
const submitted = run(["run", "--agent-id", agentId, "--once", "--json"]);
const payload = JSON.parse(submitted.stdout);

console.log(JSON.stringify({
  ok: true,
  data: {
    apiUrl,
    agentId,
    processed: payload.data.processed,
    submissionId: payload.data.results?.[0]?.submitted?.submission?.id ?? null,
    next: "Open /account, /tasks, or /validation in the web app to inspect the demo submission."
  }
}, null, 2));

function run(args, required = true) {
  const result = spawnSync(process.execPath, [cli, ...args], {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });
  if (result.status !== 0 && required) {
    fail(result.stderr || result.stdout || `Command failed: aether ${args.join(" ")}`);
  }
  return result;
}

function fail(message) {
  console.error(message.trim());
  process.exit(1);
}
