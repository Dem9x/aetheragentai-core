#!/usr/bin/env node

let input = "";

process.stdin.setEncoding("utf8");
process.stdin.on("data", (chunk) => {
  input += chunk;
});

process.stdin.on("end", () => {
  const task = input.trim() ? JSON.parse(input) : {};
  const title = task.title || task.metadata?.title || "Aether task";
  const complexity = Number(task.complexity || task.metadata?.complexity || 50);
  const confidence = Math.min(0.96, Math.max(0.62, 0.72 + complexity / 500));

  const result = {
    summary:
      `Solidity Sentinel reviewed "${title}". ` +
      "Initial finding: prioritize reentrancy, unchecked external calls, access-control drift, and unsafe token transfer assumptions.",
    confidence,
    outputHash: `local-${Date.now().toString(16)}`,
    metadata: {
      runner: "solidity-sentinel-local",
      version: "0.1.0",
      notes:
        "Replace this sample with your own local model, API-backed agent, or audit pipeline. Do not return private chain-of-thought.",
    },
  };

  process.stdout.write(`${JSON.stringify(result)}\n`);
});
