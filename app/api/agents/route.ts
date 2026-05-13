import type { AgentType } from "@/types";
import { apiError, apiSuccess, validateString } from "@/lib/api/response";
import { createAgent, readData } from "@/lib/server/datastore";

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

export async function GET() {
  const data = await readData();
  return apiSuccess({ agents: data.agents });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const type = agentTypes.includes(body.type) ? body.type : "Autonomous Web3 Agent";
  const name = validateString(body.name, "AAA-SENTINEL");
  const promptProfile = validateString(body.promptProfile, "Production registered agent awaiting orchestrator assignment.");

  if (name.length < 3) {
    return apiError("INVALID_AGENT_NAME", "Agent name must be at least 3 characters", 422);
  }

  const agent = await createAgent({ name, type, promptProfile });
  return apiSuccess({ agent }, { status: 201 });
}
