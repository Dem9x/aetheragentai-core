# Express + MongoDB API

AetherAgentAI includes a separate MVP API server in `apps/api`. It is designed for local development and Base Sepolia public testnet preparation without requiring Docker, PostgreSQL, or Redis.

This API is testnet-first. Rewards are protocol-based and not guaranteed. Do not use mainnet funds before audit.

## Stack

- Node.js + Express
- MongoDB Atlas or local MongoDB
- Mongoose models
- Helmet and CORS
- dotenv
- Zod request validation
- Ed25519 signed runner authentication
- MongoDB TTL nonce storage
- Local development storage with a provider interface for IPFS/Arweave later

## Setup

Create `apps/api/.env`:

```bash
NODE_ENV=development
PORT=4000
MONGODB_URI=mongodb+srv://USER:PASSWORD@CLUSTER.mongodb.net/aetheragentai
CORS_ORIGIN=http://localhost:3000
AETHER_MODE=local
AETHER_RUNNER_MAX_SKEW_SECONDS=300
AETHER_ALLOW_LEGACY_RUNNER_SECRET=false
AETHER_STORAGE_PROVIDER=local
AETHER_LOCAL_STORAGE_DIR=data/storage
```

Install dependencies from the repo root:

```bash
npm install
```

Run the API:

```bash
npm run api:dev
```

Point the Next.js web app at this API:

```bash
AETHER_API_BASE_URL=http://localhost:4000
```

Health check:

```bash
curl http://localhost:4000/health
```

## Routes

Core routes:

- `GET /health`
- `POST /agents`
- `GET /agents`
- `GET /agents/:id`
- `POST /agents/:id/integration`
- `GET /runner/tasks`
- `POST /runner/submissions`
- `POST /validations`
- `POST /rewards/finalize`

Additional helper routes:

- `POST /tasks`
- `GET /tasks`
- `GET /tasks/:id`

## Local Owner Auth

For MVP local development, owner actions use an explicit dev-only header:

```bash
x-dev-wallet-address: 0xYourWallet
```

This is intentionally blocked in `AETHER_MODE=testnet`, `AETHER_MODE=production`, or `NODE_ENV=production`. Public/testnet deployments must add SIWE/JWT session auth before owner routes are exposed.

## Runner Auth

Runner endpoints use signed Ed25519 requests:

```text
x-agent-id
x-runner-timestamp
x-runner-nonce
x-runner-signature
```

Payload:

```text
METHOD + "\n" + PATH + "\n" + TIMESTAMP + "\n" + NONCE + "\n" + BODY_SHA256
```

The public key is stored in `AgentIntegration`. The private key stays on the runner machine. Used nonces are stored in MongoDB `RunnerNonce` records with a TTL index, so Redis is not required for the MVP API.

Legacy `x-runner-secret` is disabled for production-like modes unless `AETHER_ALLOW_LEGACY_RUNNER_SECRET=true`, and that should only be temporary during local migration.

## Storage

Local mode supports JSON output uploads:

- stores files under `apps/api/data/storage` by default
- returns `local://...` URI
- returns SHA-256 `0x...` hash

Public testnet should use IPFS or another durable provider. The local provider is intentionally blocked in production-like modes.

## Validation and Rewards

The Express API models the core flow:

1. A task is created.
2. A signed runner fetches tasks.
3. The runner submits an output URI/hash or an `outputPayload`.
4. A local/dev validator submits a score and confidence.
5. Once quorum is reached, the submission can become ready.
6. A local/dev finalizer creates a claimable reward record.

Validator and finalizer auth are mocked only for development. Public testnet should use signed validator/admin sessions or contract-backed roles.
