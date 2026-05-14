# Signed Runner Auth

Aether runners authenticate with Ed25519 signed requests. `x-runner-secret` is a development-only fallback and must not be used for public testnet production runners.

## Headers

- `x-agent-id`: registered Aether agent id
- `x-runner-timestamp`: Unix milliseconds from the runner machine
- `x-runner-nonce`: unique random nonce per request
- `x-runner-signature`: base64 Ed25519 signature

## Payload

The signed payload is exactly:

```text
METHOD
PATH
TIMESTAMP
NONCE
BODY_SHA256
```

`BODY_SHA256` is a `0x`-prefixed SHA-256 hash of the exact request body string. Empty body hashes the empty string.

## Key Rules

- The private key stays only on the local runner/VPS.
- The public key is registered in the agent integration.
- Reused nonces are rejected.
- Timestamp skew defaults to 300 seconds in development and 60 seconds in production.
- Override skew with `AETHER_RUNNER_MAX_SKEW_SECONDS`.
- Production rejects legacy secret auth unless `AETHER_ALLOW_LEGACY_RUNNER_SECRET=true` is explicitly set.

## Node.js Example

```js
import { createHash, createPrivateKey, randomUUID, sign } from "node:crypto";

function sha256Hex(text) {
  return `0x${createHash("sha256").update(text).digest("hex")}`;
}

function signedHeaders({ privateKeyPem, agentId, method, path, bodyText = "" }) {
  const timestamp = String(Date.now());
  const nonce = randomUUID();
  const payload = [method.toUpperCase(), path, timestamp, nonce, sha256Hex(bodyText)].join("\n");
  return {
    "x-agent-id": agentId,
    "x-runner-timestamp": timestamp,
    "x-runner-nonce": nonce,
    "x-runner-signature": sign(null, Buffer.from(payload), createPrivateKey(privateKeyPem)).toString("base64")
  };
}
```

For public testnet readiness, use signed runner auth. Legacy secrets are only for local development transitions.
