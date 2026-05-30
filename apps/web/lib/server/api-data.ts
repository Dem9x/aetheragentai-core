import "server-only";

import { getAetherApiBaseUrl } from "@/lib/server/aether-api";
import type { Agent, NetworkStats, Reward, Task, TaskSubmission } from "@/types";

type ApiEnvelope<T> = { ok: true; data: T } | { ok: false; error?: { message?: string } };

const emptyStats: NetworkStats = {
  aaaPrice: 0,
  activeAgents: 0,
  tasksSolved: 0,
  intelligenceScore: 0,
  rewardsDistributed: 0,
  validationConfidence: 0,
  swarmCount: 0
};

async function apiGet<T>(path: string): Promise<T> {
  const response = await fetch(`${getAetherApiBaseUrl()}${path}`, { cache: "no-store" });
  const payload = await response.json().catch(() => null) as ApiEnvelope<T> | null;
  if (!response.ok || !payload?.ok) {
    throw new Error(payload && "error" in payload ? payload.error?.message ?? "Aether API request failed" : "Aether API request failed");
  }
  return payload.data;
}

function mapAgent(raw: any): Agent {
  const submissions = Array.isArray(raw.submissions) ? raw.submissions : [];
  const integration = raw.integration ?? null;
  return {
    id: String(raw._id ?? raw.id),
    name: raw.name ?? "Unnamed Agent",
    type: mapAgentType(raw.agentType),
    status: raw.active === false ? "Paused" : "Idle",
    model: "user-owned runner",
    promptProfile: raw.description ?? raw.metadataURI ?? "User-owned agent connected through Aether API.",
    xp: Number(raw.stats?.tasksValidated ?? 0) * 100,
    reputation: Number(raw.reputation ?? 0),
    totalRewards: 0,
    solvedTasks: Number(raw.stats?.tasksValidated ?? 0),
    winRate: raw.stats?.tasksSubmitted ? Math.round((Number(raw.stats.tasksValidated ?? 0) / Number(raw.stats.tasksSubmitted)) * 100) : 0,
    validationScore: Math.round(Number(raw.stats?.averageScore ?? 0)),
    poiScore: Math.round(Number(raw.stats?.averageScore ?? raw.reputation ?? 0)),
    evolutionLevel: Math.max(1, Math.floor(Number(raw.reputation ?? 0) / 100) + 1),
    skills: Object.fromEntries((integration?.capabilities?.length ? integration.capabilities : ["runner", "validation", "task-output"]).map((skill: string) => [skill, 70])),
    unlockableModules: ["Signed runner auth", "Validator reputation", "IPFS metadata"],
    recentOutputs: submissions.slice(0, 3).map((item: any) => item.summary ?? item.solutionURI ?? "Submitted output"),
    history: submissions.slice(0, 8).map((item: any) => ({
      task: String(item.task?.title ?? item.task ?? "Task"),
      score: Number(item.poiScore ?? 0),
      reward: 0,
      date: item.createdAt ? new Date(item.createdAt).toLocaleDateString("en-US") : "pending"
    })),
    trend: [40, 48, 52, 60, 66, 72, Math.round(Number(raw.stats?.averageScore ?? 76))],
    integration
  };
}

function mapTask(raw: any): Task {
  const status = mapTaskStatus(raw.status);
  const validationStatus = mapValidationStatus(raw.status);
  return {
    id: String(raw._id ?? raw.id),
    onchainTaskId: raw.chainTaskId,
    title: raw.title ?? "Untitled Task",
    category: mapTaskCategory(raw.category),
    creatorType: raw.creatorType ?? "PROTOCOL",
    creatorName: raw.creatorName ?? raw.creatorLabel ?? "Aether Protocol",
    creatorAddress: raw.creatorAddress,
    creatorLabel: raw.creatorLabel,
    metadataURI: raw.metadataURI ?? "pending://metadata",
    rewardToken: "AAA",
    rewardFundingStatus: raw.rewardAmount > 0 ? "FUNDED" : "UNFUNDED",
    fundingTxHash: raw.fundingTxHash,
    escrowContract: raw.escrowContract,
    createdAt: raw.createdAt ?? new Date().toISOString(),
    brief: raw.brief ?? raw.metadataURI ?? "Task metadata is stored off-chain.",
    expectedOutput: raw.expectedOutputSchema ? JSON.stringify(raw.expectedOutputSchema) : "Submit output URI/hash or signed runner payload.",
    complexityScore: Number(raw.complexity ?? raw.complexityScore ?? 70),
    rewardAAA: Number(raw.rewardAmount ?? 0),
    deadline: raw.deadline ?? "No deadline",
    validationMethod: raw.validationMethod ?? "MANUAL_VALIDATOR",
    validationStatus,
    requiredValidatorQuorum: Number(raw.requiredValidatorQuorum ?? 3),
    validatorCount: Number(raw.validatorCount ?? 0),
    passingScore: Number(raw.passingScore ?? 80),
    settlementStatus: mapSettlementStatus(raw.settlementStatus),
    solvedAt: raw.solvedAt,
    finalizedBy: raw.finalizedBy,
    requiredSkills: Array.isArray(raw.requiredSkills) ? raw.requiredSkills : [String(raw.category ?? "general").toLowerCase()],
    competitors: Number(raw.competitors ?? raw.submissions?.length ?? 0),
    status,
    confidenceTarget: Number(raw.confidenceTarget ?? 85),
    submittedAgents: Array.isArray(raw.submittedAgents) ? raw.submittedAgents : []
  };
}

function mapSubmission(raw: any): TaskSubmission {
  return {
    id: String(raw._id ?? raw.id),
    taskId: String(raw.task?._id ?? raw.task ?? raw.taskId ?? ""),
    agentId: String(raw.agent?._id ?? raw.agent ?? raw.agentId ?? ""),
    walletAddress: raw.submitterAddress,
    solution: raw.solutionURI ?? raw.summary ?? "",
    poi: {
      totalScore: Number(raw.poiScore ?? 0),
      grade: "B",
      components: {},
      explanation: "Indexed from Aether API validation record."
    },
    reward: { amount: 0, breakdown: {} },
    status: raw.status === "REJECTED" ? "Rejected" : raw.status === "VALIDATED" || raw.status === "REWARDED" ? "Validated" : "Submitted",
    createdAt: raw.createdAt ?? new Date().toISOString()
  };
}

function mapReward(raw: any): Reward {
  return {
    id: String(raw._id ?? raw.id),
    source: raw.task?.title ?? raw.submission ?? "Validated task contribution",
    amount: Number(raw.amount ?? 0),
    status: raw.status === "CLAIMED" ? "Claimed" : raw.status === "PENDING" ? "Pending" : "Claimable",
    timestamp: raw.createdAt ?? new Date().toISOString()
  };
}

function mapAgentType(type?: string): Agent["type"] {
  const value = String(type ?? "").toUpperCase();
  if (value.includes("SECURITY")) return "Security Agent";
  if (value.includes("RESEARCH")) return "Research Agent";
  if (value.includes("TRADING")) return "Trading Agent";
  if (value.includes("MATH")) return "Mathematical Reasoning Agent";
  if (value.includes("BLOCKCHAIN")) return "Blockchain Analysis Agent";
  if (value.includes("COD")) return "Coding Agent";
  return "Autonomous Web3 Agent";
}

function mapTaskCategory(category?: string): Task["category"] {
  const value = String(category ?? "").toUpperCase();
  if (value.includes("WEB3") || value.includes("BLOCKCHAIN") || value.includes("SECURITY")) return "Web3 Tasks";
  if (value.includes("REASON")) return "AI Reasoning Tasks";
  if (value.includes("REAL")) return "Real-World Tasks";
  return "Technical Tasks";
}

function mapTaskStatus(status?: string): Task["status"] {
  if (status === "VALIDATING") return "Validating";
  if (status === "VALIDATED" || status === "REWARDED") return "Solved";
  if (status === "IN_PROGRESS") return "Mining";
  return "Open";
}

function mapValidationStatus(status?: string): Task["validationStatus"] {
  if (status === "VALIDATING") return "IN_VALIDATION";
  if (status === "VALIDATED" || status === "REWARDED") return "FINALIZED";
  return "SUBMISSIONS_OPEN";
}

function mapSettlementStatus(status?: string): Task["settlementStatus"] {
  if (status === "READY") return "PENDING_ALLOCATION";
  if (status === "FINALIZED") return "CLAIMABLE";
  return "NOT_READY";
}

export async function listApiAgents() {
  const data = await apiGet<{ agents: any[] }>("/agents");
  return (data.agents ?? []).map(mapAgent);
}

export async function getApiAgent(id: string) {
  const data = await apiGet<{ agent: any; integration?: any }>(`/agents/${encodeURIComponent(id)}`);
  return mapAgent({ ...data.agent, integration: data.integration });
}

export async function listApiTasks() {
  const data = await apiGet<{ tasks: any[] }>("/tasks");
  return (data.tasks ?? []).map(mapTask);
}

export async function getApiTaskWithSubmissions(id: string) {
  const data = await apiGet<{ task: any; submissions?: any[] }>(`/tasks/${encodeURIComponent(id)}`);
  return {
    task: mapTask(data.task),
    submissions: (data.submissions ?? []).map(mapSubmission)
  };
}

export async function listApiRewards() {
  const data = await apiGet<{ rewards: any[] }>("/rewards");
  return (data.rewards ?? []).map(mapReward);
}

export async function getApiNetworkOverview() {
  const [agents, tasks, rewards] = await Promise.all([
    listApiAgents().catch(() => []),
    listApiTasks().catch(() => []),
    listApiRewards().catch(() => [])
  ]);
  const confidenceTasks = tasks.filter((task) => task.validationStatus === "FINALIZED");
  return {
    stats: {
      ...emptyStats,
      activeAgents: agents.filter((agent) => agent.status !== "Paused").length,
      tasksSolved: tasks.filter((task) => task.status === "Solved").length,
      rewardsDistributed: rewards.reduce((sum, reward) => sum + reward.amount, 0),
      intelligenceScore: Math.round(agents.reduce((sum, agent) => sum + agent.poiScore, 0) / Math.max(agents.length, 1)),
      validationConfidence: Math.round(confidenceTasks.reduce((sum, task) => sum + task.confidenceTarget, 0) / Math.max(confidenceTasks.length, 1))
    },
    activity: []
  };
}
