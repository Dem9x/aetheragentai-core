import { apiSuccess } from "@/lib/api/response";
import { readData } from "@/lib/server/datastore";

export const dynamic = "force-dynamic";

export async function GET() {
  const data = await readData();
  return apiSuccess({
    service: "aetheragentai-web",
    status: "ok",
    uptime: process.uptime(),
    checks: {
      app: "ok",
      datastore: data.agents.length > 0 && data.tasks.length > 0 ? "ok" : "empty",
      wallet: "browser_eip1193",
      blockchain: "not_connected",
      agentOrchestrator: "not_connected"
    }
  });
}
