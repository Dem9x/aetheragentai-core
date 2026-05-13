# Dependency Audit Notes

Last reviewed: 2026-05-13

## What Changed

The repository now keeps the smart contract toolchain outside the root npm workspace.

Root install:

```bash
npm.cmd install
```

installs only:

- `apps/web`
- `packages/agent-cli`

It does not install Hardhat, Solidity compiler tooling, gas reporter, coverage tooling, or contract test dependencies.

Contracts are installed separately:

```bash
npm.cmd run contracts:install
```

This keeps production web/CLI dependency audit separate from dev-only smart contract tooling.

## Current Root Audit

Root audit currently reports only the Next.js bundled PostCSS advisory:

```text
postcss <8.5.10 via next/node_modules/postcss
```

`npm audit fix --force` suggests downgrading Next to `9.3.3`, which is not a valid fix for this app and would break the production Next.js App Router stack.

Resolution:

- Do not run `npm audit fix --force` for this finding.
- Keep Next pinned through package-lock.
- Upgrade Next as soon as a stable Next release ships with patched bundled PostCSS.

## Current Contracts Audit

Contracts audit is isolated:

```bash
npm.cmd audit --prefix packages/contracts
```

Remaining findings are low severity and flow through the Hardhat 2 / ethers v5 dev-only chain, especially `elliptic`.

`npm audit fix --force` suggests moving to Hardhat 3, which is a breaking migration:

- Hardhat 3 plugin API differs.
- `@nomicfoundation/hardhat-ethers` v4 requires Hardhat 3.
- Tests and deployment scripts must be revalidated.

Resolution:

- Keep Hardhat 2 for now because contract tests pass and the tooling is dev-only.
- Plan a dedicated Hardhat 3 migration branch.
- Do not use unaudited mainnet deployments.

## Verification Commands

```bash
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run build
npm.cmd run cli:test
npm.cmd run contracts:compile
npm.cmd run contracts:test
```

## Safety Policy

- Do not use mainnet funds before audit.
- Testnet only until audited.
- Rewards are protocol-based and not guaranteed.
- AI validation can be imperfect.
