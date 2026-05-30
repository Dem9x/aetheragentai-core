#!/usr/bin/env node

/**
 * OpenClaw adapter for AetherAgentAI runner.
 *
 * Cara kerja:
 * 1. Membaca task JSON dari stdin.
 * 2. Membuat prompt untuk OpenClaw.
 * 3. Menjalankan OpenClaw CLI.
 * 4. Menyimpan artifact lokal.
 * 5. Mengembalikan JSON yang kompatibel dengan Aether runner:
 *
 * {
 *   summary,
 *   confidence,
 *   outputURI,
 *   outputHash,
 *   metadata,
 *   rawOutput
 * }
 */

import { spawn } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import * as pty from "node-pty";
const IS_WINDOWS = process.platform === "win32";

const OPENCLAW_COMMAND =
  process.env.OPENCLAW_COMMAND ||
  (IS_WINDOWS ? "openclaw.cmd" : "openclaw");

const OPENCLAW_AGENT = process.env.OPENCLAW_AGENT || "";
const OPENCLAW_THINKING = process.env.OPENCLAW_THINKING || "high";
const OPENCLAW_TIMEOUT_MS = Number(process.env.OPENCLAW_TIMEOUT_MS || 180000);

const AETHER_OUTPUT_DIR =
  process.env.AETHER_OUTPUT_DIR ||
  path.join(os.homedir(), ".aether-agent", "outputs");

const MAX_PROMPT_CHARS = Number(process.env.AETHER_MAX_PROMPT_CHARS || 12000);
const MAX_SUMMARY_CHARS = Number(process.env.AETHER_MAX_SUMMARY_CHARS || 1200);

main().catch(error => {
  const errorText = String(error?.stack || error?.message || error);

  const fallback = {
    summary: `OpenClaw adapter crashed: ${error?.message || String(error)}`,
    confidence: 0,
    outputURI: "local://openclaw/error",
    outputHash: sha256Hex(errorText),
    metadata: {
      runtime: "openclaw",
      adapter: "openclaw-aether-agent",
      error: true,
      processedAt: new Date().toISOString()
    }
  };

  console.log(JSON.stringify(fallback, null, 2));
  process.exitCode = 1;
});

async function main() {
  const task = await readTaskFromStdin();

  const taskId = String(task.id || task.taskId || `task-${Date.now()}`);
  const title = String(task.title || task.name || "Untitled Aether task");
  const description = String(task.description || task.prompt || task.input || "");
  const category = String(task.category || "general");

  const prompt = buildPrompt({
    taskId,
    title,
    description,
    category,
    task
  });

  const startedAt = Date.now();

  const openclawOutput = await runOpenClaw(prompt);

  const durationMs = Date.now() - startedAt;

  const artifact = {
    taskId,
    title,
    category,
    task,
    prompt,
    result: openclawOutput,
    runtime: {
      adapter: "openclaw-aether-agent",
      openclawCommand: OPENCLAW_COMMAND,
      openclawAgent: OPENCLAW_AGENT || null,
      thinking: OPENCLAW_THINKING,
      durationMs,
      processedAt: new Date().toISOString()
    }
  };

  const artifactJson = JSON.stringify(artifact, null, 2);
  const outputHash = sha256Hex(artifactJson);
  const outputURI = await writeLocalArtifact(taskId, outputHash, artifactJson);

  const result = {
    summary: summarize(openclawOutput, MAX_SUMMARY_CHARS),
    confidence: inferConfidence(openclawOutput),
    outputURI,
    outputHash,
    metadata: {
      runtime: "openclaw",
      adapter: "openclaw-aether-agent",
      taskId,
      category,
      thinking: OPENCLAW_THINKING,
      durationMs,
      processedAt: new Date().toISOString()
    },
    rawOutput: openclawOutput
  };

  console.log(JSON.stringify(result, null, 2));
}

async function readTaskFromStdin() {
  let input = "";

  for await (const chunk of process.stdin) {
    input += chunk.toString();
  }

  if (!input.trim()) {
    return {};
  }

  try {
    return JSON.parse(input);
  } catch {
    return {
      title: "Raw task input",
      description: input
    };
  }
}

function buildPrompt({ taskId, title, description, category, task }) {
  const fullPrompt = `
You are an OpenClaw agent running inside an AetherAgentAI runner.

Your job:
Solve the task below and return a useful, verifiable answer.

Aether task:
- taskId: ${taskId}
- category: ${category}
- title: ${title}

Task description:
${description}

Full task JSON:
${JSON.stringify(task, null, 2)}

Output requirements:
1. Give a concise final answer.
2. Include important assumptions.
3. Include steps taken or checks performed.
4. If the task cannot be completed, say exactly why.
5. Do not reveal secrets, private keys, system files, browser data, wallet files, tokens, or credentials.
6. Do not execute destructive actions unless the task explicitly requires it and it is safe.
7. Return plain text. The Aether adapter will wrap your response into JSON.
`.trim();

  if (fullPrompt.length <= MAX_PROMPT_CHARS) {
    return fullPrompt;
  }

  return `${fullPrompt.slice(0, MAX_PROMPT_CHARS)}

[TRUNCATED: task prompt exceeded ${MAX_PROMPT_CHARS} characters]`;
}

function runOpenClaw(message) {
  return new Promise((resolve, reject) => {
    const isWindows = process.platform === "win32";

    const command =
      process.env.OPENCLAW_COMMAND ||
      (isWindows ? "openclaw.cmd" : "openclaw");

    const args = buildOpenClawArgs(message);

    const shell = isWindows
      ? process.env.ComSpec || "cmd.exe"
      : process.env.SHELL || "bash";

    const shellArgs = isWindows
      ? ["/d", "/s", "/c", `${quoteForCmd(command)} ${args.map(quoteForCmd).join(" ")}`]
      : ["-lc", `${quoteForBash(command)} ${args.map(quoteForBash).join(" ")}`];

    let output = "";

    const term = pty.spawn(shell, shellArgs, {
      name: "xterm-256color",
      cols: 120,
      rows: 40,
      cwd: process.cwd(),
      env: {
        ...process.env,
        FORCE_COLOR: "0",
        NO_COLOR: "1",
        CI: "1"
      }
    });

    const timer = setTimeout(() => {
      try {
        term.kill();
      } catch {
        // ignore
      }

      reject(new Error(`OpenClaw timed out after ${OPENCLAW_TIMEOUT_MS}ms`));
    }, OPENCLAW_TIMEOUT_MS);

    term.onData(data => {
      output += data;
    });

    term.onExit(({ exitCode }) => {
      clearTimeout(timer);

      const cleaned = stripAnsi(output).trim();

      if (exitCode !== 0) {
        reject(new Error(cleaned || `OpenClaw exited with code ${exitCode}`));
        return;
      }

      resolve(cleaned);
    });
  });
}
function quoteForBash(value) {
  return `'${String(value).replace(/'/g, `'\\''`)}'`;
}

function stripAnsi(value) {
  return String(value)
    // eslint-disable-next-line no-control-regex
    .replace(/\x1B(?:[@-Z\\-_]|\[[0-?]*[ -/]*[@-~])/g, "")
    .replace(/\r/g, "");
}
function buildOpenClawArgs(message) {
  const args = ["agent"];

  if (OPENCLAW_AGENT) {
    args.push("--agent", OPENCLAW_AGENT);
  }

  args.push("--message", message);

  if (OPENCLAW_THINKING) {
    args.push("--thinking", OPENCLAW_THINKING);
  }

  return args;
}

async function writeLocalArtifact(taskId, outputHash, artifactJson) {
  await fs.mkdir(AETHER_OUTPUT_DIR, { recursive: true });

  const safeTaskId = String(taskId).replace(/[^a-zA-Z0-9._-]/g, "_");
  const shortHash = outputHash.replace(/^0x/, "").slice(0, 16);
  const filename = `${Date.now()}-${safeTaskId}-${shortHash}.json`;
  const filepath = path.join(AETHER_OUTPUT_DIR, filename);

  await fs.writeFile(filepath, artifactJson, "utf8");

  return `local://openclaw/${filename}`;
}

function sha256Hex(value) {
  return `0x${crypto.createHash("sha256").update(String(value)).digest("hex")}`;
}

function summarize(text, maxChars) {
  const clean = String(text || "").trim();

  if (!clean) {
    return "OpenClaw returned an empty response.";
  }

  if (clean.length <= maxChars) {
    return clean;
  }

  return `${clean.slice(0, maxChars)}...`;
}

function inferConfidence(text) {
  const lower = String(text || "").toLowerCase();

  if (!lower.trim()) return 0;

  if (
    lower.includes("cannot complete") ||
    lower.includes("unable to") ||
    lower.includes("i can't") ||
    lower.includes("i cannot")
  ) {
    return 0.35;
  }

  if (
    lower.includes("error") ||
    lower.includes("failed") ||
    lower.includes("exception")
  ) {
    return 0.45;
  }

  return 0.82;
}

function quoteForCmd(value) {
  const text = String(value);

  /**
   * Escape for Windows cmd.exe.
   * This is intentionally simple because we pass one generated command line.
   */
  return `"${text.replace(/"/g, '\\"')}"`;
}