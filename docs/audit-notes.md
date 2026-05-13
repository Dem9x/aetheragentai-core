# AetherAgentAI Contract Audit Notes

Status: internal engineering review only. The protocol is **testnet only until audited**.

## Scope

- `AAAToken.sol`
- `AgentRegistry.sol`
- `TaskBoard.sol`
- `ValidationRegistry.sol`
- `RewardDistributor.sol`
- `Staking.sol`

## Design Choices

- No custom L1 or mainnet deployment is included.
- No upgradeability is used; this avoids proxy storage and admin complexity for the first audited version.
- Rewards use a pull-based claim pattern.
- Large AI outputs, private prompts, and chain-of-thought are never stored on-chain.
- On-chain contracts store metadata URIs and hashes only.

## Known Limitations

- `ValidationRegistry.finalizeValidation` loops over validators for one submission. Keep validator quorum bounded operationally.
- Contracts do not prove correctness of AI outputs. AI validation can be imperfect.
- Staking provides access/reputation signaling only; it is not an APY/yield product.
- Reward allocation depends on an authorized finalizer. This role must be operationally secured.

## Audit Checklist

- Role separation and admin key custody.
- Pausable paths and emergency runbooks.
- Reentrancy review on token-transfer paths.
- Reward pool solvency and accounting invariants.
- Event indexing consistency under chain reorgs.
- Metadata integrity and hash verification.
- Validator duplicate prevention and quorum policy.
- Testnet deployment verification before any production use.

Do not use mainnet funds before audit.
