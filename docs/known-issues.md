# Known Issues

These are intentional blockers before mainnet:

- MVP reward finalizer is trusted.
- Public beta should use Safe multisig for admin/finalizer roles.
- In-memory runner nonce replay cache should be replaced with Redis/Upstash in multi-instance production.
- In-memory rate limiting is development-only for critical endpoints.
- IPFS/Arweave adapters are not fully implemented.
- Validator reputation and dispute flow are still early.
- Contract audit is required before mainnet funds.
- Marketplace, arena, swarm, governance, hosted studio, staking UI, and public leaderboard remain disabled/future until the core testnet flow is stable.

Do not use mainnet funds before audit. Rewards are protocol-based and not guaranteed.
