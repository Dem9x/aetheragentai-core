import { createHash } from "node:crypto";

export function sha256Hex(value) {
  return `0x${createHash("sha256").update(value).digest("hex")}`;
}

export function canonicalJson(value) {
  return JSON.stringify(value);
}
