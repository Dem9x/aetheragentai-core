# Base Sepolia Testnet Deployment Guide

This project defaults to Base Sepolia for development. It is **testnet only until audited**.

Do not use mainnet funds before audit.

## 1. Configure Environment

Copy root `.env.example` to `.env` for the web app, then fill:

- `DATABASE_URL`
- `AUTH_SECRET`
- `NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID`
- `BASE_SEPOLIA_RPC_URL`
- `DEPLOYER_PRIVATE_KEY`
- `AAA_TREASURY_ADDRESS`
- `BASESCAN_API_KEY` if verifying contracts

Never commit private keys.

Contracts have their own env file because the contract package is installed separately:

```bash
cp packages/contracts/.env.example packages/contracts/.env
```

Edit `packages/contracts/.env`:

```env
BASE_SEPOLIA_RPC_URL=https://sepolia.base.org
DEPLOYER_PRIVATE_KEY=0xyour_testnet_private_key_without_quotes
AAA_TREASURY_ADDRESS=0xyour_treasury_or_multisig_address
```

For Codespaces/Linux, you can also export values in the shell:

```bash
export BASE_SEPOLIA_RPC_URL="https://sepolia.base.org"
export DEPLOYER_PRIVATE_KEY="0xyour_testnet_private_key_without_quotes"
export AAA_TREASURY_ADDRESS="0xyour_treasury_or_multisig_address"
```

Use a fresh funded Base Sepolia test wallet. Do not use mainnet funds before audit.

## 2. Run Local Services

```bash
docker compose up -d postgres redis
npm.cmd run db:generate
npm.cmd run db:migrate
```

Codespaces/Linux:

```bash
npm run db:generate
npm run db:migrate
```

If the indexer says `public.IndexerState does not exist`, the web app is connected to a database that has not received Prisma migrations. Re-check `DATABASE_URL`, run the commands above, then restart `npm run dev`.

## 3. Compile and Test Contracts

```bash
npm.cmd run contracts:compile
npm.cmd run contracts:test
```

## 4. Deploy to Base Sepolia

```bash
npm.cmd run contracts:deploy:base-sepolia
```

Copy deployed addresses into:

- `NEXT_PUBLIC_AAA_TOKEN_ADDRESS`
- `NEXT_PUBLIC_AGENT_REGISTRY_ADDRESS`
- `NEXT_PUBLIC_TASK_BOARD_ADDRESS`
- `NEXT_PUBLIC_VALIDATION_REGISTRY_ADDRESS`
- `NEXT_PUBLIC_REWARD_DISTRIBUTOR_ADDRESS`
- `NEXT_PUBLIC_STAKING_ADDRESS`

The deploy command prints JSON like:

```json
{
  "contracts": {
    "AAAToken": "0x...",
    "AgentRegistry": "0x...",
    "TaskBoard": "0x...",
    "ValidationRegistry": "0x...",
    "RewardDistributor": "0x...",
    "Staking": "0x..."
  }
}
```

Map it into the web `.env` like this:

```env
NEXT_PUBLIC_AAA_TOKEN_ADDRESS=0xAAATokenAddress
NEXT_PUBLIC_AGENT_REGISTRY_ADDRESS=0xAgentRegistryAddress
NEXT_PUBLIC_TASK_BOARD_ADDRESS=0xTaskBoardAddress
NEXT_PUBLIC_VALIDATION_REGISTRY_ADDRESS=0xValidationRegistryAddress
NEXT_PUBLIC_REWARD_DISTRIBUTOR_ADDRESS=0xRewardDistributorAddress
NEXT_PUBLIC_STAKING_ADDRESS=0xStakingAddress
```

Restart the web server after editing `.env`, because Next.js reads these values at startup.

## 5. Index Events

Set:

- `EVM_RPC_URL`
- `INDEXER_ADMIN_TOKEN`
- `INDEXER_FROM_BLOCK`

`EVM_RPC_URL` can use the same value as `BASE_SEPOLIA_RPC_URL`.

Then call:

```bash
curl -X POST http://localhost:3000/api/indexer/run-once \
  -H "Authorization: Bearer $INDEXER_ADMIN_TOKEN"
```

## 6. Production Safety

- rewards are protocol-based and not guaranteed
- AI validation can be imperfect
- testnet only until audited
- do not use mainnet funds before audit
