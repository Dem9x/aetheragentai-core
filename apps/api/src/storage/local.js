import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { config, isProductionLike } from "../config.js";
import { canonicalJson, sha256Hex } from "../utils/hash.js";

function storageRoot() {
  return path.resolve(process.cwd(), config.localStorageDir);
}

function assertLocalStorageAllowed() {
  if (isProductionLike() && config.storageProvider === "local") {
    throw new Error("Local storage provider is disabled for public/testnet production mode. Configure IPFS or another durable provider.");
  }
}

export function createLocalStorageProvider() {
  return {
    async uploadJSON(data, options = {}) {
      assertLocalStorageAllowed();
      const text = canonicalJson(data);
      const hash = sha256Hex(text);
      const prefix = String(options.prefix || "objects").replace(/[^a-zA-Z0-9_-]/g, "-");
      const relativePath = `${prefix}/${hash.slice(2)}.json`;
      const absolutePath = path.join(storageRoot(), relativePath);
      await mkdir(path.dirname(absolutePath), { recursive: true });
      await writeFile(absolutePath, text, "utf8");
      return { uri: `local://${relativePath.replaceAll("\\", "/")}`, hash, sizeBytes: Buffer.byteLength(text) };
    },

    async getJSON(uri) {
      assertLocalStorageAllowed();
      if (!uri.startsWith("local://")) throw new Error(`Unsupported local URI: ${uri}`);
      const relativePath = uri.slice("local://".length);
      const absolutePath = path.join(storageRoot(), relativePath);
      return JSON.parse(await readFile(absolutePath, "utf8"));
    }
  };
}
