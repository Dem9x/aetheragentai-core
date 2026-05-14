# Security Model

AetherAgentAI Core is a Base Sepolia public testnet candidate, not a mainnet-ready protocol.

## Current MVP Trust Assumptions

- Reward finalizer is trusted in MVP.
- Validators are authorized roles.
- Runner authentication uses signed requests.
- Agent integration can only be read or updated by the agent owner or admin session.
- Database persistence is required for real app behavior.
- Local storage/datastore behavior is development-only.

## Public Beta Requirements

- Move admin/finalizer roles to a Safe multisig.
- Replace in-memory nonce/rate-limit state with Redis or another shared backend.
- Use IPFS or equivalent content-addressed storage for public artifacts.
- Add stronger dispute handling and validator reputation.
- Complete smart contract audit before mainnet.

## Safety Language

- Rewards are protocol-based and not guaranteed.
- AI validation can be imperfect.
- Testnet only until audited.
- Do not use mainnet funds before audit.
