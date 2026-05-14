import { createHash, createPublicKey, verify } from "node:crypto";
import { getAgentIntegration, verifySecret } from "@/server/agents/integration";

const usedNonces = new Map<string, number>();
const maxSkewMs = 5 * 60 * 1000;

function sha256Hex(text: string) {
  return `0x${createHash("sha256").update(text).digest("hex")}`;
}

function signaturePayload(method: string, path: string, timestamp: string, nonce: string, bodyHash: string) {
  return [method.toUpperCase(), path, timestamp, nonce, bodyHash].join("\n");
}

function rememberNonce(agentId: string, nonce: string) {
  const now = Date.now();
  for (const [key, expiresAt] of usedNonces.entries()) {
    if (expiresAt < now) usedNonces.delete(key);
  }
  const key = `${agentId}:${nonce}`;
  if (usedNonces.has(key)) return false;
  usedNonces.set(key, now + maxSkewMs);
  return true;
}

export async function verifyRunnerRequest(request: Request, agentId: string, bodyText = "") {
  const integration = await getAgentIntegration(agentId);
  if (!integration) {
    return { ok: false as const, status: 404, code: "INTEGRATION_NOT_FOUND", message: "Agent integration is not configured" };
  }

  const timestamp = request.headers.get("x-runner-timestamp") ?? "";
  const nonce = request.headers.get("x-runner-nonce") ?? "";
  const signature = request.headers.get("x-runner-signature") ?? "";
  const bodyHash = sha256Hex(bodyText);

  if (integration.publicKey) {
    const issuedAt = Number(timestamp);
    if (!timestamp || !Number.isFinite(issuedAt) || Math.abs(Date.now() - issuedAt) > maxSkewMs) {
      return { ok: false as const, status: 401, code: "INVALID_RUNNER_TIMESTAMP", message: "Runner timestamp is missing, invalid, or expired" };
    }
    if (!nonce || !rememberNonce(agentId, nonce)) {
      return { ok: false as const, status: 401, code: "INVALID_RUNNER_NONCE", message: "Runner nonce is missing or already used" };
    }
    if (!signature) {
      return { ok: false as const, status: 401, code: "RUNNER_SIGNATURE_REQUIRED", message: "x-runner-signature header is required" };
    }

    const payload = signaturePayload(request.method, new URL(request.url).pathname, timestamp, nonce, bodyHash);
    const valid = verify(null, Buffer.from(payload), createPublicKey(integration.publicKey), Buffer.from(signature, "base64"));
    if (!valid) {
      return { ok: false as const, status: 401, code: "INVALID_RUNNER_SIGNATURE", message: "Runner signature verification failed" };
    }

    return { ok: true as const, integration };
  }

  if (process.env.NODE_ENV === "production") {
    return { ok: false as const, status: 401, code: "RUNNER_PUBLIC_KEY_REQUIRED", message: "Production runners require signed requests with a registered public key" };
  }

  const runnerSecret = request.headers.get("x-runner-secret") ?? "";
  if (integration.webhookSecretHash && !verifySecret(runnerSecret, integration.webhookSecretHash)) {
    return { ok: false as const, status: 401, code: "INVALID_RUNNER_SECRET", message: "Runner secret verification failed" };
  }
  if (!integration.webhookSecretHash) {
    return { ok: false as const, status: 401, code: "RUNNER_AUTH_NOT_CONFIGURED", message: "Runner auth is not configured for this agent" };
  }

  return { ok: true as const, integration };
}
