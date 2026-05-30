import { timingSafeEqual, createHash } from "node:crypto";

export function hashSecret(secret) {
  if (!secret) return "";
  return `sha256:${createHash("sha256").update(secret).digest("hex")}`;
}

export function verifySecret(secret, expectedHash) {
  if (!secret || !expectedHash?.startsWith("sha256:")) return false;
  const actual = Buffer.from(hashSecret(secret));
  const expected = Buffer.from(expectedHash);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
