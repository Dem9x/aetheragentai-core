import { createHash } from "node:crypto";

export type StoredMetadata<T> = {
  metadataURI: string;
  metadataHash: string;
  payload: T;
};

export interface MetadataStorage {
  put<T extends Record<string, unknown>>(kind: "agent" | "task" | "solution" | "validation", payload: T): Promise<StoredMetadata<T>>;
}

export class LocalDatabaseMetadataStorage implements MetadataStorage {
  async put<T extends Record<string, unknown>>(kind: "agent" | "task" | "solution" | "validation", payload: T): Promise<StoredMetadata<T>> {
    const canonical = JSON.stringify(payload);
    const hash = `0x${createHash("sha256").update(canonical).digest("hex")}`;
    return {
      metadataURI: `db://${kind}/${hash}`,
      metadataHash: hash,
      payload
    };
  }
}

export class IpfsMetadataStorage implements MetadataStorage {
  async put<T extends Record<string, unknown>>(): Promise<StoredMetadata<T>> {
    throw new Error("IPFS storage provider is not configured. Set PINATA_JWT, WEB3_STORAGE_TOKEN, or ARWEAVE_KEY and implement this adapter.");
  }
}

export function getMetadataStorage(): MetadataStorage {
  if (process.env.METADATA_STORAGE_PROVIDER === "ipfs") {
    return new IpfsMetadataStorage();
  }
  return new LocalDatabaseMetadataStorage();
}
