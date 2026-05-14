#!/usr/bin/env node

/*
  Example adapter for any user-owned agent tool.

  Aether sends one task JSON to stdin.
  This adapter calls a local command or HTTP endpoint, then prints the JSON shape
  required by the Aether runner.

  Env options:
    OPENCLAW_COMMAND="node /path/to/openclaw-agent.mjs"
    OPENCLAW_ENDPOINT="http://127.0.0.1:8787/run"
*/

import { spawn } from "node:child_process";
import { createHash } from "node:crypto";

let input = "";
process.stdin.setEncoding("utf8");
process.stdin.on("data", (chunk) => {
  input += chunk;
});

process.stdin.on("end", async () => {
  try {
    const task = input.trim() ? JSON.parse(input) : {};
    const result = process.env.OPENCLAW_ENDPOINT
      ? await runHttpAgent(process.env.OPENCLAW_ENDPOINT, task)
      : await runCommandAgent(process.env.OPENCLAW_COMMAND, task);

    const summary = String(result.summary || result.output || result.answer || "").trim();
    if (!summary) {
      throw new Error("Agent result must include summary, output, or answer");
    }

    const output = {
      summary,
      confidence: clamp(Number(result.confidence ?? 0.75), 0, 1),
      outputURI: result.outputURI || result.uri || undefined,
      outputHash: result.outputHash || sha256Hex(summary),
      metadata: {
        adapter: "openclaw-compatible",
        source: process.env.OPENCLAW_ENDPOINT ? "http" : "command"
      }
    };

    process.stdout.write(`${JSON.stringify(output)}\n`);
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : "Agent adapter failed"}\n`);
    process.exit(1);
  }
});

async function runHttpAgent(endpoint, task) {
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ task })
  });
  if (!response.ok) {
    throw new Error(`OpenClaw endpoint failed with ${response.status}`);
  }
  return response.json();
}

function runCommandAgent(command, task) {
  if (!command) {
    return Promise.resolve({
      summary:
        `OpenClaw adapter demo processed "${task.title || task.taskId || "task"}". ` +
        "Set OPENCLAW_COMMAND or OPENCLAW_ENDPOINT to connect your real agent.",
      confidence: 0.62
    });
  }

  return new Promise((resolve, reject) => {
    const child = spawn(command, { shell: true, stdio: ["pipe", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(`OpenClaw command exited ${code}: ${stderr.slice(0, 500)}`));
        return;
      }
      try {
        resolve(JSON.parse(stdout));
      } catch {
        reject(new Error("OpenClaw command must print JSON"));
      }
    });
    child.stdin.end(JSON.stringify(task));
  });
}

function sha256Hex(text) {
  return `0x${createHash("sha256").update(text).digest("hex")}`;
}

function clamp(value, min, max) {
  if (Number.isNaN(value)) return 0.75;
  return Math.max(min, Math.min(max, value));
}
