import dotenv from "dotenv";

dotenv.config();

export const config = {
  env: process.env.NODE_ENV || "development",
  mode: process.env.AETHER_MODE || "local",
  port: Number(process.env.PORT || 4000),
  mongoUri: process.env.MONGODB_URI || "",
  corsOrigin: process.env.CORS_ORIGIN || "http://localhost:3000",
  runnerMaxSkewSeconds: Number(process.env.AETHER_RUNNER_MAX_SKEW_SECONDS || (process.env.NODE_ENV === "production" ? 60 : 300)),
  allowLegacyRunnerSecret: process.env.AETHER_ALLOW_LEGACY_RUNNER_SECRET === "true",
  storageProvider: process.env.AETHER_STORAGE_PROVIDER || "local",
  localStorageDir: process.env.AETHER_LOCAL_STORAGE_DIR || "data/storage"
};

export function isProductionLike() {
  return config.env === "production" || config.mode === "testnet" || config.mode === "production";
}
