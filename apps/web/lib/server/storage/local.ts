import "server-only";

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { sha256Hex } from "@/lib/server/storage/hash";
import type { StorageProvider } from "@/lib/server/storage";

function localStorageAllowed() {
  return process.env.NODE_ENV !== "production" || process.env.AETHER_MODE === "local" || process.env.AETHER_ALLOW_LOCAL_STORAGE === "true";
}

export class LocalStorageProvider implements StorageProvider {
  private readonly root = join(/*turbopackIgnore: true*/ process.cwd(), "data", "storage");

  async uploadJSON(data: unknown, options?: { prefix?: string }) {
    if (!localStorageAllowed()) {
      throw new Error("Local storage provider is disabled in production. Use IPFS/Arweave or set AETHER_ALLOW_LOCAL_STORAGE=true only for test/dev.");
    }
    const canonical = JSON.stringify(data);
    const hash = sha256Hex(canonical);
    const prefix = options?.prefix?.replace(/[^a-zA-Z0-9_-]/g, "-") || "json";
    const dir = join(this.root, prefix);
    await mkdir(dir, { recursive: true });
    const fileName = `${hash.slice(2)}.json`;
    await writeFile(join(dir, fileName), `${canonical}\n`, "utf8");
    return {
      uri: `local://${prefix}/${fileName}`,
      hash,
      sizeBytes: Buffer.byteLength(canonical)
    };
  }

  async getJSON(uri: string) {
    if (!uri.startsWith("local://")) throw new Error("LocalStorageProvider can only read local:// URIs");
    const relative = uri.replace("local://", "");
    const raw = await readFile(join(this.root, relative), "utf8");
    return JSON.parse(raw);
  }
}
