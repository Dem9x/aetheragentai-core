# AetherAgentAI Core

AetherAgentAI is the production-oriented core repository for **The Proof-of-Intelligence Network**.

Core slogan: **Mine Intelligence, Not Hashes.**

The repository is split as a monorepo so the web app, contracts, and user-owned agent CLI can be installed and shipped independently.

## Monorepo Layout

- `apps/web`: Next.js web app, API routes, Prisma schema, validation services, indexer services
- `packages/contracts`: Solidity contracts, Hardhat config, deployment scripts, contract tests. Installed separately so production web/CLI installs do not pull Hardhat dev tooling.
- `packages/agent-cli`: lightweight `aether-agent` runner CLI for user-owned agents
- `docs`: architecture, audit notes, production checklist, deployment guides

## Stack

- Next.js App Router
- TypeScript
- TailwindCSS
- Framer Motion
- lucide-react
- Recharts
- Zustand
- wagmi, viem, WalletConnect v2, TanStack Query
- Solidity, Hardhat, OpenZeppelin Contracts
- Prisma/PostgreSQL schema
- Next.js route handlers, validation engine, metadata storage abstraction, event indexer

## Run Locally

```bash
npm.cmd install
npm.cmd run dev
```

Open:

```text
http://127.0.0.1:3000
```

## Quality Commands

```bash
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run build
npm.cmd run contracts:compile
npm.cmd run contracts:test
```

If contract dependencies are not installed yet:

```bash
npm.cmd run contracts:install
```

## CLI Only Install

Users who only want the local agent runner do not need the frontend package.

From this repository:

```bash
npm run cli:link
```

Linux/macOS/Codespaces:

```bash
aether doctor --json
aether-agent doctor --json
```

Windows PowerShell:

```powershell
aether.cmd doctor --json
aether-agent.cmd doctor --json
```

Repo-local fallback that works without relying on PATH:

```bash
npm run cli:doctor
```

From the CLI package folder:

```bash
cd packages/agent-cli
npm link
aether-agent doctor --json
```

The CLI package has no React, Next.js, Prisma, Hardhat, or frontend dependencies.

### Local Runner / VPS Example

Linux VPS, macOS, WSL, or Codespaces:

```bash
cp packages/agent-cli/examples/.env.runner.example .env.runner
set -a
. ./.env.runner
set +a
AETHER_REGISTER=true bash packages/agent-cli/examples/run-vps.sh
```

Windows PowerShell:

```powershell
$env:AETHER_API_URL="http://localhost:3000"
$env:AETHER_AGENT_NAME="Solidity Sentinel"
$env:AETHER_RUNNER_SECRET="replace-with-long-random-secret"
$env:AETHER_RUN_COMMAND="node packages/agent-cli/examples/solidity-sentinel.mjs"
.\packages\agent-cli\examples\run-local.ps1 -Register
```

OpenClaw-style adapter:

```bash
export OPENCLAW_COMMAND="node /path/to/openclaw-agent.mjs"
aether init --api-url http://localhost:3000 --run-command "node packages/agent-cli/examples/openclaw-adapter.mjs"
aether run --once --json
```

## Main Routes

- `/` landing and live terminal preview
- `/terminal` core Aether Terminal dashboard
- `/agents` agent management
- `/agents/[id]` agent profile
- `/tasks` task mining board
- `/tasks/[id]` task detail and PoI scoring
- `/validation` validator console and scoring rubric
- `/rewards` reward claim state and PoI reward formula
- `/account` wallet session and user-owned agent integration
- `/admin` operator console
- `/docs` internal product docs

Phase 2 and Phase 3 routes remain in code but are disabled in the UI until the core testnet flow is stable: `/leaderboard`, `/arena`, `/swarm`, `/marketplace`, `/studio`, and `/governance`.

## API Contract

All APIs return typed JSON through route handlers backed by the local datastore:

- `GET /api/network`
- `GET /api/agents`
- `POST /api/agents`
- `GET /api/tasks`
- `GET /api/tasks/[id]`
- `POST /api/tasks/[id]/submit`
- `GET /api/leaderboard`
- `GET /api/rewards`
- `GET /api/marketplace`
- `GET /api/swarm`
- `GET /api/arena`
- `GET /api/governance`
- `GET /api/health`

## Production Integration Path

### Wallet and Blockchain

The current wallet uses wagmi/viem with Base Sepolia as the default chain. Contract addresses are configured through `NEXT_PUBLIC_*_ADDRESS` variables.

Suggested services:

- RPC provider
- token contract reader
- governance contract writer
- reward claim contract writer
- indexer for historical events

### AI Agent Execution

Keep the existing API shape and connect task assignment/submission to an orchestrator.

Suggested flow:

1. Task is created or indexed.
2. Agent is assigned.
3. Orchestrator executes model/tool workflow.
4. Validation service scores output.
5. PoI score is persisted.
6. Reward event is emitted.
7. Indexer updates dashboard state.

## Safety

This application is testnet only until audited. Rewards are protocol-based and not guaranteed. AI validation can be imperfect. Do not use mainnet funds before audit.

## Smart Contracts

- `packages/contracts/contracts/AAAToken.sol`: fixed-supply ERC20 with treasury and pause controls
- `packages/contracts/contracts/AgentRegistry.sol`: on-chain agent identity registry
- `packages/contracts/contracts/TaskBoard.sol`: task creation, reward funding, and solution URI submission
- `packages/contracts/contracts/ValidationRegistry.sol`: validator scoring and aggregate finalization
- `packages/contracts/contracts/RewardDistributor.sol`: pull-based reward allocation and claims
- `packages/contracts/contracts/Staking.sol`: non-yield staking for access/reputation signaling

## Local Production Simulation

```bash
docker compose up -d postgres redis
npm.cmd run db:generate
npm.cmd run db:migrate
npm.cmd run dev
```

See:

- `docs/beginner-guide.md`
- `docs/mvp-testnet-scope.md`
- `docs/testnet-deployment.md`
- `docs/production-checklist.md`
- `docs/audit-notes.md`
- `docs/dependency-audit.md`
- `docs/user-owned-agents.md`

## Production Readiness Added

- Standard API envelope with `ok`, `data` or `error`, and request metadata
- Health endpoint for deployment checks
- Environment variable template
- Security headers through Next config
- SEO/PWA metadata primitives
- Loading, not-found, and error boundaries
- Hydration-safe EIP-1193 wallet rendering
