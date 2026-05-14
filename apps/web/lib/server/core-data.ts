import "server-only";

import { createHash } from "node:crypto";
import type { Prisma } from "@prisma/client";
import { prisma, databaseConfigured } from "@/lib/server/prisma";
import type {
  ActivityLog,
  Agent,
  AgentRuntimeType,
  AgentType,
  NetworkStats,
  Reward,
  Task,
  TaskCategory,
  TaskCreatorType,
  TaskFundingStatus,
  TaskSettlementStatus,
  TaskSubmission,
  TaskValidationStatus
} from "@/types";

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

const taskCategories: TaskCategory[] = ["Technical Tasks", "AI Reasoning Tasks", "Web3 Tasks", "Real-World Tasks"];

export function requireDatabase() {
  if (!databaseConfigured) {
    throw new Error("Real app mode requires DATABASE_URL. Run Prisma migrations and connect PostgreSQL before using core Aether flows.");
  }
}

function decimalToNumber(value: Prisma.Decimal | number | string | null | undefined) {
  if (value == null) return 0;
  return Number(value.toString());
}

function normalizeAgentType(value: string): AgentType {
  return agentTypes.includes(value as AgentType) ? (value as AgentType) : "Autonomous Web3 Agent";
}

function normalizeTaskCategory(value: string): TaskCategory {
  return taskCategories.includes(value as TaskCategory) ? (value as TaskCategory) : "Technical Tasks";
}

function normalizeTaskStatus(value: string): Task["status"] {
  const status = value.toUpperCase();
  if (status === "SOLVED" || status === "FINALIZED") return "Solved";
  if (status === "VALIDATING" || status === "IN_VALIDATION") return "Validating";
  if (status === "MINING" || status === "ASSIGNED") return "Mining";
  return "Open";
}

function hashJson(value: unknown) {
  return `0x${createHash("sha256").update(JSON.stringify(value)).digest("hex")}`;
}

function mapActivityType(value: string): ActivityLog["type"] {
  const normalized = value.toUpperCase();
  if (normalized.includes("REWARD")) return "REWARD";
  if (normalized.includes("VALIDATION")) return "VALIDATION";
  if (normalized.includes("AGENT")) return "AGENT_DEPLOYED";
  if (normalized.includes("SWARM")) return "SWARM";
  if (normalized.includes("ARENA")) return "ARENA";
  return "TASK_SOLVED";
}

function mapSeverity(value: string): ActivityLog["severity"] {
  const normalized = value.toLowerCase();
  if (normalized === "success" || normalized === "warning" || normalized === "danger" || normalized === "info") return normalized;
  return "info";
}

type DbAgent = Prisma.AgentGetPayload<{ include: { stats: true; integration: true; submissions: { include: { task: true } } } }>;
type DbTask = Prisma.TaskGetPayload<{ include: { stats: true; submissions: { include: { agent: true } } } }>;
type DbSubmission = Prisma.SubmissionGetPayload<{ include: { task: true } }>;
type AgentIntegrationStatus = NonNullable<Agent["integration"]>["status"];

export function mapAgent(agent: DbAgent): Agent {
  const solvedTasks = agent.stats?.solvedTasks ?? agent.submissions.filter((submission) => submission.status !== "REJECTED").length;
  const poiScore = agent.stats?.poiScore ?? agent.reputation;
  return {
    id: agent.id,
    name: agent.name,
    type: normalizeAgentType(agent.agentType),
    status: agent.active ? "Idle" : "Paused",
    model: "user-owned",
    promptProfile: agent.metadataURI,
    xp: solvedTasks * 120,
    reputation: agent.reputation,
    totalRewards: decimalToNumber(agent.stats?.totalRewards),
    solvedTasks,
    winRate: solvedTasks > 0 ? Math.min(100, Math.round((solvedTasks / Math.max(agent.submissions.length, 1)) * 100)) : 0,
    validationScore: agent.stats?.validationConfidence ?? 0,
    poiScore,
    evolutionLevel: Math.max(1, Math.floor(poiScore / 100) + 1),
    skills: {},
    unlockableModules: [],
    recentOutputs: agent.submissions.slice(0, 4).map((submission) => submission.solutionURI),
    history: agent.submissions.slice(0, 8).map((submission) => ({
      task: submission.task.title,
      score: Number(submission.poiScore?.toString() ?? 0),
      reward: 0,
      date: submission.createdAt.toISOString().slice(0, 10)
    })),
    trend: [Math.max(0, poiScore - 12), Math.max(0, poiScore - 7), poiScore],
    integration: agent.integration
      ? {
          runtimeType: agent.integration.runtimeType as AgentRuntimeType,
          agentEndpoint: agent.integration.agentEndpoint ?? undefined,
          publicKey: agent.integration.publicKey ?? undefined,
          webhookSecretHash: agent.integration.webhookSecretHash ?? undefined,
          capabilities: agent.integration.capabilities,
          status: agent.integration.status as AgentIntegrationStatus,
          lastCheckedAt: agent.integration.lastCheckedAt?.toISOString()
        }
      : null
  };
}

export function mapTask(task: DbTask): Task {
  const complexityScore = Math.max(1, Math.min(100, task.passingScore));
  return {
    id: task.id,
    onchainTaskId: task.chainTaskId?.toString(),
    title: task.title,
    category: normalizeTaskCategory(task.category),
    creatorType: task.creatorType as TaskCreatorType,
    creatorName: task.creatorName,
    creatorAddress: task.creatorAddress,
    creatorLabel: task.creatorLabel ?? undefined,
    metadataURI: task.metadataURI,
    rewardToken: "AAA",
    rewardFundingStatus: task.fundingStatus as TaskFundingStatus,
    fundingTxHash: task.fundingTxHash ?? undefined,
    escrowContract: task.escrowContract ?? undefined,
    createdAt: task.createdAt.toISOString(),
    brief: `Metadata: ${task.metadataURI}`,
    expectedOutput: "Submit a concise solution URI/hash. Do not include private chain-of-thought.",
    complexityScore,
    rewardAAA: decimalToNumber(task.rewardAmount),
    deadline: task.deadline.toISOString(),
    validationMethod: task.validationMethod,
    validationStatus: task.validationStatus as TaskValidationStatus,
    requiredValidatorQuorum: task.requiredValidatorQuorum,
    validatorCount: task.validatorCount,
    passingScore: task.passingScore,
    settlementStatus: task.settlementStatus as TaskSettlementStatus,
    solvedAt: task.solvedAt?.toISOString(),
    finalizedBy: task.finalizedBy ?? undefined,
    requiredSkills: [],
    competitors: task.stats?.submissionCount ?? task.submissions.length,
    status: normalizeTaskStatus(task.status),
    confidenceTarget: task.passingScore,
    submittedAgents: task.submissions.map((submission) => submission.agent?.name ?? submission.agentId ?? submission.submitterAddress)
  };
}

export function mapSubmission(submission: DbSubmission): TaskSubmission {
  return {
    id: submission.id,
    taskId: submission.taskId,
    agentId: submission.agentId ?? "unlinked-agent",
    walletAddress: submission.submitterAddress,
    solution: submission.solutionURI,
    poi: {
      totalScore: Number(submission.poiScore?.toString() ?? 0),
      grade: "B",
      components: {},
      explanation: "Stored submission score from validation pipeline."
    },
    reward: {
      amount: 0,
      breakdown: {}
    },
    status: submission.status === "REJECTED" ? "Rejected" : submission.status === "VALIDATED" ? "Validated" : "Submitted",
    createdAt: submission.createdAt.toISOString()
  };
}

export async function listAgents() {
  requireDatabase();
  const agents = await prisma.agent.findMany({
    orderBy: { createdAt: "desc" },
    include: { stats: true, integration: true, submissions: { include: { task: true }, orderBy: { createdAt: "desc" } } }
  });
  return agents.map(mapAgent);
}

export async function getAgent(id: string) {
  requireDatabase();
  const agent = await prisma.agent.findUnique({
    where: { id },
    include: { stats: true, integration: true, submissions: { include: { task: true }, orderBy: { createdAt: "desc" } } }
  });
  return agent ? mapAgent(agent) : null;
}

export async function createAgent(input: { ownerAddress: string; userId?: string; name: string; type: AgentType; metadataURI?: string; promptProfile?: string }) {
  requireDatabase();
  const metadata = {
    name: input.name,
    agentType: input.type,
    description: input.promptProfile ?? "User-owned AetherAgentAI worker.",
    version: "1.0.0"
  };
  const agent = await prisma.agent.create({
    data: {
      ownerAddress: input.ownerAddress.toLowerCase(),
      userId: input.userId,
      name: input.name,
      agentType: input.type,
      metadataURI: input.metadataURI ?? `db://agent-metadata/${hashJson(metadata)}`,
      metadataHash: hashJson(metadata),
      reputation: 0,
      stats: { create: {} }
    },
    include: { stats: true, integration: true, submissions: { include: { task: true } } }
  });

  await prisma.activityLog.create({
    data: { type: "AGENT_REGISTERED", severity: "success", message: `Agent registered: ${agent.name}` }
  });

  return mapAgent(agent);
}

export async function listTasks() {
  requireDatabase();
  const tasks = await prisma.task.findMany({
    orderBy: { createdAt: "desc" },
    include: { stats: true, submissions: { include: { agent: true }, orderBy: { createdAt: "desc" } } }
  });
  return tasks.map(mapTask);
}

export async function createTask(input: {
  creatorType: TaskCreatorType;
  creatorName: string;
  creatorAddress: string;
  creatorLabel?: string;
  metadataURI: string;
  metadataHash: string;
  title: string;
  category: string;
  rewardAmount: number;
  rewardToken?: "AAA";
  fundingStatus: TaskFundingStatus;
  deadline: Date;
  status?: string;
  validationMethod: string;
  requiredValidatorQuorum: number;
  passingScore: number;
}) {
  requireDatabase();
  const task = await prisma.task.create({
    data: {
      creatorType: input.creatorType,
      creatorName: input.creatorName,
      creatorAddress: input.creatorAddress.toLowerCase(),
      creatorLabel: input.creatorLabel,
      metadataURI: input.metadataURI,
      metadataHash: input.metadataHash,
      title: input.title,
      category: input.category,
      rewardAmount: input.rewardAmount.toString(),
      rewardToken: input.rewardToken ?? "AAA",
      fundingStatus: input.fundingStatus,
      deadline: input.deadline,
      status: input.status ?? "OPEN",
      validationMethod: input.validationMethod,
      validationStatus: "SUBMISSIONS_OPEN",
      requiredValidatorQuorum: input.requiredValidatorQuorum,
      passingScore: input.passingScore,
      settlementStatus: "NOT_READY",
      stats: { create: {} }
    },
    include: { stats: true, submissions: { include: { agent: true } } }
  });
  await prisma.activityLog.create({
    data: { type: "TASK_CREATED", severity: "success", message: `Task created: ${task.title}` }
  });
  return mapTask(task);
}

export async function getTask(id: string) {
  requireDatabase();
  const where = /^\d+$/.test(id) ? { OR: [{ id }, { chainTaskId: BigInt(id) }] } : { id };
  const task = await prisma.task.findFirst({
    where,
    include: { stats: true, submissions: { include: { agent: true }, orderBy: { createdAt: "desc" } } }
  });
  return task ? mapTask(task) : null;
}

export async function getTaskWithSubmissions(id: string) {
  requireDatabase();
  const where = /^\d+$/.test(id) ? { OR: [{ id }, { chainTaskId: BigInt(id) }] } : { id };
  const task = await prisma.task.findFirst({
    where,
    include: {
      stats: true,
      submissions: { include: { agent: true, task: true }, orderBy: { createdAt: "desc" } }
    }
  });
  if (!task) return null;
  return {
    task: mapTask(task),
    submissions: task.submissions.map(mapSubmission)
  };
}

export async function assignAgentToTask(taskId: string, agentId: string) {
  requireDatabase();
  const [task, agent] = await Promise.all([
    prisma.task.findUnique({ where: { id: taskId } }),
    prisma.agent.findUnique({ where: { id: agentId } })
  ]);
  if (!task) return null;
  if (!agent) throw new Error("Agent not found");

  await prisma.task.update({
    where: { id: taskId },
    data: {
      status: task.status === "OPEN" ? "ASSIGNED" : task.status,
      validationStatus: task.validationStatus === "NOT_STARTED" ? "SUBMISSIONS_OPEN" : task.validationStatus
    }
  });
  await prisma.activityLog.create({
    data: { type: "TASK_ASSIGNED", severity: "info", message: `${agent.name} assigned to ${task.title}` }
  });
  return { taskId, agentId, assignedAgent: agent.name, status: "ASSIGNED" };
}

export async function createSubmission(input: { taskId: string; agentId?: string; submitterAddress: string; summary: string; outputURI?: string; outputHash?: string; poiScore?: number }) {
  requireDatabase();
  const task = await prisma.task.findUnique({ where: { id: input.taskId } });
  if (!task) return null;
  if (input.agentId) {
    const agent = await prisma.agent.findUnique({ where: { id: input.agentId } });
    if (!agent) throw new Error("Agent not found");
  }

  const solutionHash = input.outputHash ?? hashJson({ taskId: input.taskId, agentId: input.agentId, summary: input.summary });
  const submission = await prisma.submission.create({
    data: {
      taskId: input.taskId,
      agentId: input.agentId,
      submitterAddress: input.submitterAddress.toLowerCase(),
      solutionURI: input.outputURI ?? `db://submission/${solutionHash}`,
      solutionHash,
      status: "SUBMITTED",
      poiScore: input.poiScore
    },
    include: { task: true }
  });
  await prisma.taskStats.upsert({
    where: { taskId: input.taskId },
    update: { submissionCount: { increment: 1 } },
    create: { taskId: input.taskId, submissionCount: 1 }
  });
  await prisma.activityLog.create({
    data: { type: "SOLUTION_SUBMITTED", severity: "success", message: `Submission received for ${task.title}` }
  });
  return mapSubmission(submission);
}

export async function listRunnerTasks() {
  const tasks = await listTasks();
  return tasks
    .filter((task) => task.status === "Open" || task.status === "Mining")
    .slice(0, 20)
    .map((task) => ({
      taskId: task.id,
      title: task.title,
      category: task.category,
      brief: task.brief,
      expectedOutput: task.expectedOutput,
      requiredSkills: task.requiredSkills,
      rewardAAA: task.rewardAAA,
      confidenceTarget: task.confidenceTarget,
      metadataURI: task.metadataURI
    }));
}

export async function getNetworkOverview(): Promise<{ stats: NetworkStats; activity: ActivityLog[] }> {
  requireDatabase();
  const [activeAgents, tasksSolved, rewards, validations, agentStats, activity] = await Promise.all([
    prisma.agent.count({ where: { active: true } }),
    prisma.task.count({ where: { OR: [{ status: "SOLVED" }, { validationStatus: "FINALIZED" }] } }),
    prisma.reward.aggregate({ _sum: { amount: true } }),
    prisma.validation.aggregate({ _avg: { confidence: true } }),
    prisma.agentStats.aggregate({ _avg: { poiScore: true } }),
    prisma.activityLog.findMany({ orderBy: { createdAt: "desc" }, take: 20 })
  ]);

  return {
    stats: {
      aaaPrice: 0,
      activeAgents,
      tasksSolved,
      intelligenceScore: Math.round(agentStats._avg.poiScore ?? 0),
      rewardsDistributed: decimalToNumber(rewards._sum.amount),
      validationConfidence: Math.round(validations._avg.confidence ?? 0),
      swarmCount: 0
    },
    activity: activity.map((item) => ({
      id: item.id,
      type: mapActivityType(item.type),
      message: item.message,
      timestamp: item.createdAt.toISOString(),
      severity: mapSeverity(item.severity)
    }))
  };
}

export async function listRewards(address?: string): Promise<Reward[]> {
  requireDatabase();
  const rewards = await prisma.reward.findMany({
    where: address ? { recipientAddress: address.toLowerCase() } : undefined,
    orderBy: { createdAt: "desc" },
    take: 100
  });
  return rewards.map((reward) => ({
    id: reward.id,
    source: reward.taskId ? `Task ${reward.taskId}` : "Protocol reward",
    amount: decimalToNumber(reward.amount),
    status: reward.status === "CLAIMED" ? "Claimed" : reward.status === "CLAIMABLE" ? "Claimable" : "Pending",
    timestamp: reward.createdAt.toISOString()
  }));
}
