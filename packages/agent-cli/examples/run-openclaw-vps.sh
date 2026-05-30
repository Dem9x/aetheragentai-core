#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
cd "$ROOT_DIR"

ENV_FILE="${1:-.env.openclaw-runner}"

if [ ! -f "$ENV_FILE" ]; then
  echo "Missing env file: $ENV_FILE"
  echo "Create it from .env.openclaw-runner first."
  exit 1
fi

set -a
# shellcheck disable=SC1090
source "$ENV_FILE"
set +a

echo "╭──────────────────────────────────────────────╮"
echo "│      AetherAgentAI OpenClaw VPS Runner       │"
echo "╰──────────────────────────────────────────────╯"

if ! command -v node >/dev/null 2>&1; then
  echo "ERROR: node is not installed."
  exit 1
fi

if ! command -v npm >/dev/null 2>&1; then
  echo "ERROR: npm is not installed."
  exit 1
fi

if ! command -v openclaw >/dev/null 2>&1; then
  echo "ERROR: openclaw is not installed."
  echo "Install with: npm install -g openclaw@latest"
  exit 1
fi

if ! command -v aether >/dev/null 2>&1; then
  echo "aether CLI not found globally. Linking..."
  npm run cli:link
fi

echo "Checking OpenClaw..."
openclaw doctor || true

echo "Checking Aether CLI..."
aether doctor --json || true

echo "Generating runner keys if needed..."
aether keys generate || true

echo "Initializing Aether runner config..."
aether init \
  --api-url "${AETHER_API_URL}" \
  --run-command "${AETHER_RUN_COMMAND}"

if [ "${AETHER_REGISTER:-false}" = "true" ]; then
  echo "Registering OpenClaw agent..."
  aether register \
    --name "${AETHER_AGENT_NAME:-OpenClaw VPS Agent}" \
    --type "${AETHER_AGENT_TYPE:-OPENCLAW}" \
    --capabilities "${AETHER_AGENT_CAPABILITIES:-research,coding,analysis}"
fi

echo "Testing OpenClaw adapter directly..."
echo '{"id":"openclaw-smoke-test","title":"Smoke test","description":"Reply with a short confirmation that the OpenClaw Aether adapter works."}' \
  | ${AETHER_RUN_COMMAND}

echo ""
echo "Starting runner loop."
echo "Interval: ${AETHER_RUN_INTERVAL_SECONDS:-30}s"
echo ""

while true; do
  set +e
  aether run --once --json
  STATUS=$?
  set -e

  if [ "$STATUS" -ne 0 ]; then
    echo "Runner cycle failed with status $STATUS"
  fi

  sleep "${AETHER_RUN_INTERVAL_SECONDS:-30}"
done
