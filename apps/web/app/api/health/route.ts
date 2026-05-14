import { apiSuccess } from "@/lib/api/response";
import { databaseConfigured } from "@/lib/server/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  return apiSuccess({
    service: "aetheragentai-web",
    status: databaseConfigured ? "ok" : "degraded",
    uptime: process.uptime(),
    checks: {
      app: "ok",
      database: databaseConfigured ? "configured" : "missing_DATABASE_URL",
      wallet: "browser_eip1193",
      blockchain: process.env.NEXT_PUBLIC_CHAIN_ID ? "configured" : "missing_chain_config",
      agentOrchestrator: process.env.AAA_AGENT_ORCHESTRATOR_URL ? "configured" : "not_configured"
    }
  });
}
