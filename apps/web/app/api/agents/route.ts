import type { AgentType } from "@/types";
import { apiError, validateString } from "@/lib/api/response";
import { apiBackendUnavailable, proxyToAetherApi } from "@/lib/server/aether-api";
import { getCurrentSession } from "@/server/api/session";

const agentTypes: AgentType[] = [
  "Coding Agent",
  "Research Agent",
  "Blockchain Analysis Agent",
  "Trading Agent",
  "Mathematical Reasoning Agent",
  "Security Agent",
  "Optimization Agent",
  "Multi-Modal Agent",
  "Autonomous Web3 Agent"
];

export async function GET(request: Request) {
  try {
    return await proxyToAetherApi(request, "/agents", { method: "GET" });
  } catch (error) {
    return apiError("AGENTS_UNAVAILABLE", error instanceof Error ? error.message : "Unable to load agents", 503);
  }
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const session = await getCurrentSession();
  const type = agentTypes.includes(body.type) ? body.type : "Autonomous Web3 Agent";
  const name = validateString(body.name, "AAA-SENTINEL");
  const promptProfile = validateString(body.promptProfile, "Production registered agent awaiting orchestrator assignment.");
  const devBypass = process.env.AETHER_DEV_AUTH_BYPASS === "true" && process.env.NODE_ENV !== "production";
  const ownerAddress = session?.address ?? (devBypass && typeof body.ownerAddress === "string" ? body.ownerAddress : "");

  if (name.length < 3) {
    return apiError("INVALID_AGENT_NAME", "Agent name must be at least 3 characters", 422);
  }
  if (!/^0x[a-fA-F0-9]{40}$/.test(ownerAddress)) {
    return apiError("AUTH_REQUIRED", "Connect and sign in with your wallet before registering a real agent.", 401);
  }

  try {
    const payload = {
      ownerAddress,
      name,
      description: promptProfile,
      agentType: type,
      metadata: {
        name,
        description: promptProfile,
        agentType: type,
        source: "apps/web"
      }
    };
    return await proxyToAetherApi(request, "/agents", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-dev-wallet-address": ownerAddress
      },
      body: JSON.stringify(payload)
    });
  } catch (error) {
    return apiBackendUnavailable(error);
  }
}
