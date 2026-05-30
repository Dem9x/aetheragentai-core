import "server-only";

export const databaseConfigured = false;

function disabled(path: string) {
  throw new Error(`${path} is disabled. apps/web now uses apps/api via AETHER_API_BASE_URL instead of Prisma.`);
}

export const prisma = new Proxy({}, {
  get(_target, property) {
    if (property === "$transaction") return () => disabled("prisma.$transaction");
    return new Proxy({}, {
      get(_nested, method) {
        return () => disabled(`prisma.${String(property)}.${String(method)}`);
      }
    });
  }
}) as any;
