import "server-only";

export interface StorageProvider {
  uploadJSON(data: unknown, options?: { prefix?: string }): Promise<{
    uri: string;
    hash: string;
    sizeBytes?: number;
  }>;
  getJSON?(uri: string): Promise<unknown>;
}

class UnconfiguredStorageProvider implements StorageProvider {
  constructor(private readonly name: string) {}

  async uploadJSON(): Promise<{ uri: string; hash: string; sizeBytes?: number }> {
    throw new Error(`${this.name} storage provider is not configured. Configure a real adapter before production use.`);
  }
}

export async function getStorageProvider(): Promise<StorageProvider> {
  const provider = process.env.AETHER_STORAGE_PROVIDER ?? "local";
  if (provider === "local") {
    const { LocalStorageProvider } = await import("@/lib/server/storage/local");
    return new LocalStorageProvider();
  }
  if (provider === "ipfs") return new UnconfiguredStorageProvider("IPFS");
  if (provider === "arweave") return new UnconfiguredStorageProvider("Arweave");
  throw new Error(`Unsupported AETHER_STORAGE_PROVIDER: ${provider}`);
}
