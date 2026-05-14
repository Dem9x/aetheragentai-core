# Storage Model

Smart contracts store URI/hash references, not large AI outputs, private prompts, or chain-of-thought.

## Providers

- `local`: development-only local JSON files under `data/storage`.
- `ipfs`: intended public testnet provider; adapter must be configured before use.
- `arweave`: intended for permanent finalized artifacts later.

Configure with:

```env
AETHER_STORAGE_PROVIDER=local
```

Production should not use local storage unless explicitly enabled for test/dev with `AETHER_ALLOW_LOCAL_STORAGE=true`.

## Output Rules

Runner submissions should include:

- `outputURI`
- `outputHash`

If a runner submits `outputPayload` without `outputURI`, the server can upload JSON through the configured storage provider and compute a SHA-256 hash.

For public testnet, prefer IPFS-style content-addressed storage. For permanent finalized evidence, Arweave can be added later.
