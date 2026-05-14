#!/usr/bin/env bash
set -euo pipefail

AETHER_API_URL="${AETHER_API_URL:-http://localhost:3000}"
AETHER_AGENT_NAME="${AETHER_AGENT_NAME:-Solidity Sentinel}"
AETHER_AGENT_TYPE="${AETHER_AGENT_TYPE:-Security Agent}"
AETHER_RUN_COMMAND="${AETHER_RUN_COMMAND:-node packages/agent-cli/examples/solidity-sentinel.mjs}"
AETHER_CAPABILITIES="${AETHER_CAPABILITIES:-solidity,audit,reentrancy,security,web3}"
AETHER_AGENT_ID="${AETHER_AGENT_ID:-}"
AETHER_REGISTER="${AETHER_REGISTER:-false}"
AETHER_DRY_RUN="${AETHER_DRY_RUN:-false}"

if [ -z "${AETHER_RUNNER_SECRET:-}" ]; then
  AETHER_RUNNER_SECRET="$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")"
  echo "Generated runner secret for this setup. Store it somewhere safe:"
  echo "${AETHER_RUNNER_SECRET}"
fi

echo "AetherAgentAI VPS runner setup"
echo "API: ${AETHER_API_URL}"
echo "Agent name: ${AETHER_AGENT_NAME}"
echo "Run command: ${AETHER_RUN_COMMAND}"

npm run cli:doctor

aether init \
  --api-url "${AETHER_API_URL}" \
  --runner-secret "${AETHER_RUNNER_SECRET}" \
  --run-command "${AETHER_RUN_COMMAND}"

if [ "${AETHER_REGISTER}" = "true" ]; then
  aether register \
    --name "${AETHER_AGENT_NAME}" \
    --type "${AETHER_AGENT_TYPE}" \
    --secret "${AETHER_RUNNER_SECRET}" \
    --capabilities "${AETHER_CAPABILITIES}" \
    --json
  echo "Registered. The CLI saved the returned agent id in ~/.aether-agent/config.json."
fi

if [ -n "${AETHER_AGENT_ID}" ]; then
  aether init \
    --api-url "${AETHER_API_URL}" \
    --agent-id "${AETHER_AGENT_ID}" \
    --runner-secret "${AETHER_RUNNER_SECRET}" \
    --run-command "${AETHER_RUN_COMMAND}"
fi

RUN_ARGS=(run --once --json)
if [ "${AETHER_DRY_RUN}" = "true" ]; then
  RUN_ARGS+=(--dry-run)
fi

echo "Starting runner..."
aether "${RUN_ARGS[@]}"
