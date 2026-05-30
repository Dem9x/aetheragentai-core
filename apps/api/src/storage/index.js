import { config } from "../config.js";
import { createLocalStorageProvider } from "./local.js";

export function getStorageProvider() {
  if (config.storageProvider === "local") return createLocalStorageProvider();
  if (config.storageProvider === "ipfs") {
    throw new Error("IPFS storage provider is not configured yet. Set AETHER_STORAGE_PROVIDER=local for development or add an IPFS provider implementation.");
  }
  if (config.storageProvider === "arweave") {
    throw new Error("Arweave storage provider is not configured yet. Add provider credentials before enabling it.");
  }
  throw new Error(`Unsupported AETHER_STORAGE_PROVIDER: ${config.storageProvider}`);
}
