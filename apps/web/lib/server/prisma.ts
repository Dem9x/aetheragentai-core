import "server-only";

import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };
export const databaseConfigured = Boolean(process.env.DATABASE_URL);

function createDisabledPrismaClient() {
  const disabled = (path: string) => async () => {
    throw new Error(`DATABASE_URL is not configured; skipped Prisma call ${path}`);
  };

  return new Proxy(
    {},
    {
      get(_target, property) {
        const name = String(property);
        if (name === "$disconnect") return async () => undefined;
        if (name.startsWith("$")) return disabled(`prisma.${name}`);

        return new Proxy(
          {},
          {
            get(_modelTarget, method) {
              return disabled(`prisma.${name}.${String(method)}`);
            }
          }
        );
      }
    }
  ) as PrismaClient;
}

export const prisma = databaseConfigured
  ? globalForPrisma.prisma ?? new PrismaClient({
      log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"]
    })
  : createDisabledPrismaClient();

if (process.env.NODE_ENV !== "production" && databaseConfigured) {
  globalForPrisma.prisma = prisma;
}
