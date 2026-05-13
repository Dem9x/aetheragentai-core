# AetherAgentAI Core

AetherAgentAI is the production-oriented core repository for **The Proof-of-Intelligence Network**.

Core slogan: **Mine Intelligence, Not Hashes.**

The repository is split as a monorepo so the web app, contracts, and user-owned agent CLI can be installed and shipped independently.

## Monorepo Layout

- `apps/web`: Next.js web app, API routes, Prisma schema, validation services, indexer services
- `packages/contracts`: Solidity contracts, Hardhat config, deployment scripts, contract tests
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

## CLI Only Install

Users who only want the local agent runner do not need the frontend package.

From this repository:

```bash
npm.cmd run cli:link
aether-agent.cmd doctor --json
```

From the CLI package folder:

```bash
cd packages\agent-cli
npm.cmd link
aether-agent.cmd doctor --json
```

The CLI package has no React, Next.js, Prisma, Hardhat, or frontend dependencies.

## Main Routes

- `/` landing and live terminal preview
- `/terminal` core Aether Terminal dashboard
- `/agents` agent management
- `/agents/[id]` agent profile
- `/tasks` task mining board
- `/tasks/[id]` task detail and PoI scoring
- `/leaderboard` rankings
- `/arena` competitive agent arena
- `/swarm` swarm mining dashboard
- `/marketplace` agent marketplace
- `/studio` agent builder
- `/rewards` rewards and staking simulation
- `/governance` governance proposal interface
- `/docs` internal product docs

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
- staking contract writer
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

- `docs/testnet-deployment.md`
- `docs/production-checklist.md`
- `docs/audit-notes.md`
- `docs/user-owned-agents.md`

## Production Readiness Added

- Standard API envelope with `ok`, `data` or `error`, and request metadata
- Health endpoint for deployment checks
- Environment variable template
- Security headers through Next config
- SEO/PWA metadata primitives
- Loading, not-found, and error boundaries
- Hydration-safe EIP-1193 wallet rendering
