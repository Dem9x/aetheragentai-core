# Production Checklist

## Protocol

- Independent smart contract audit completed.
- Role admin keys secured by multisig.
- Reward finalizer and validator keys separated.
- Pauser role runbook documented.
- Contract addresses verified on block explorer.
- Event indexer tested against reorg scenarios.

## Backend

- `AUTH_SECRET` generated with high entropy.
- Wallet login requires signed nonce.
- Write endpoints rate limited.
- Server-side Zod validation enabled.
- AI provider keys stored server-side only.
- Logs redact secrets and signatures.
- Database backups configured.

## Frontend

- Wrong network handling tested.
- Transaction pending/success/failure states tested.
- Explorer links point to correct chain.
- No guaranteed earning or profit language.

## Product Safety Copy

- rewards are protocol-based and not guaranteed
- testnet only until audited
- AI validation can be imperfect
- do not use mainnet funds before audit
