import "server-only";

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { Agent, AppData, Task, TaskSubmission } from "@/types";
import {
  activityLogs,
  agents,
  arenaMatches,
  governanceProposals,
  leaderboard,
  marketplaceAssets,
  networkStats,
  rewards,
  swarms,
  tasks
} from "@/lib/seed-data";

const dataDirectory = path.join(process.cwd(), "data");
const dataFile = path.join(dataDirectory, "aetheragentai.json");

function assertLocalDatastoreAllowed() {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Local JSON datastore is disabled in production. Configure DATABASE_URL and use Prisma-backed persistence.");
  }
}

function seedData(): AppData {
  return {
    agents,
    tasks,
    rewards,
    leaderboard,
    marketplaceAssets,
    arenaMatches,
    swarms,
    governanceProposals,
    networkStats,
    activityLogs,
    submissions: [],
    agentIntegrations: {}
  };
}

function normalizeTask(task: Task, index: number): Task {
  const creatorType = task.creatorType ?? (index % 3 === 0 ? "PROTOCOL" : index % 3 === 1 ? "DAO" : "USER");
  const isSolved = task.status === "Solved";
  const isValidating = task.status === "Validating";

  return {
    ...task,
    onchainTaskId: task.onchainTaskId ?? String(index + 1),
    creatorType,
    creatorName: task.creatorName ?? (creatorType === "PROTOCOL" ? "Aether Protocol" : creatorType === "DAO" ? "External DAO" : creatorType === "SYSTEM" ? "Aether Scheduler" : "User Project"),
    creatorAddress: task.creatorAddress ?? "0x0000000000000000000000000000000000000000",
    creatorLabel: task.creatorLabel ?? `${creatorType.toLowerCase()} task creator`,
    metadataURI: task.metadataURI ?? `local://tasks/${task.id}`,
    rewardToken: task.rewardToken ?? "AAA",
    rewardFundingStatus: task.rewardFundingStatus ?? (isSolved ? "ALLOCATED" : "FUNDED"),
    fundingTxHash: task.fundingTxHash,
    escrowContract: task.escrowContract ?? "TaskBoard",
    createdAt: task.createdAt ?? new Date().toISOString(),
    validationStatus: task.validationStatus ?? (isSolved ? "FINALIZED" : isValidating ? "IN_VALIDATION" : "SUBMISSIONS_OPEN"),
    requiredValidatorQuorum: task.requiredValidatorQuorum ?? 3,
    validatorCount: task.validatorCount ?? (isSolved ? 3 : isValidating ? 1 : 0),
    passingScore: task.passingScore ?? 85,
    settlementStatus: task.settlementStatus ?? (isSolved ? "CLAIMABLE" : isValidating ? "PENDING_ALLOCATION" : "NOT_READY"),
    solvedAt: task.solvedAt,
    finalizedBy: task.finalizedBy
  };
}

function normalizeData(data: AppData): AppData {
  return {
    ...data,
    tasks: data.tasks.map(normalizeTask)
  };
}

async function ensureDataFile() {
  assertLocalDatastoreAllowed();
  await mkdir(dataDirectory, { recursive: true });

  try {
    await readFile(dataFile, "utf8");
  } catch {
    await writeFile(dataFile, JSON.stringify(seedData(), null, 2), "utf8");
  }
}

export async function readData(): Promise<AppData> {
  assertLocalDatastoreAllowed();
  await ensureDataFile();
  const raw = await readFile(dataFile, "utf8");
  return normalizeData({ ...seedData(), ...JSON.parse(raw) } as AppData);
}

export async function writeData(data: AppData) {
  assertLocalDatastoreAllowed();
  await mkdir(dataDirectory, { recursive: true });
  await writeFile(dataFile, JSON.stringify(data, null, 2), "utf8");
}

export async function createAgent(input: Pick<Agent, "name" | "type" | "promptProfile">) {
  const data = await readData();
  const template = data.agents[0] ?? agents[0];
  const agent: Agent = {
    ...template,
    id: `agent-${crypto.randomUUID()}`,
    name: input.name,
    type: input.type,
    status: "Idle",
    model: "AAA-Agent-Runtime",
    promptProfile: input.promptProfile,
    xp: 0,
    reputation: 50,
    totalRewards: 0,
    solvedTasks: 0,
    winRate: 0,
    validationScore: 0,
    poiScore: 0,
    evolutionLevel: 1,
    history: [],
    trend: [0, 0, 0, 0, 0, 0, 0]
  };

  data.agents = [agent, ...data.agents];
  data.networkStats.activeAgents += 1;
  data.activityLogs = [
    {
      id: `log-${crypto.randomUUID()}`,
      type: "AGENT_DEPLOYED",
      message: `${agent.name} registered as a real persisted agent`,
      timestamp: new Date().toISOString(),
      severity: "success"
    },
    ...data.activityLogs
  ];
  await writeData(data);
  return agent;
}

export async function createSubmission(submission: TaskSubmission) {
  const data = await readData();
  data.submissions = [submission, ...data.submissions];
  data.tasks = data.tasks.map((task) => {
    if (task.id !== submission.taskId) return task;
    const submittedAgents = Array.from(new Set([...task.submittedAgents, submission.agentId]));
    return { ...task, status: "Validating", validationStatus: "IN_VALIDATION", settlementStatus: "PENDING_ALLOCATION", submittedAgents };
  });
  data.rewards = [
    {
      id: `reward-${crypto.randomUUID()}`,
      source: `Task submission ${submission.taskId}`,
      amount: submission.reward.amount,
      status: "Pending",
      timestamp: submission.createdAt
    },
    ...data.rewards
  ];
  data.activityLogs = [
    {
      id: `log-${crypto.randomUUID()}`,
      type: "VALIDATION",
      message: `${submission.agentId} submitted real solution for ${submission.taskId} with PoI ${submission.poi.totalScore}`,
      timestamp: submission.createdAt,
      severity: "info"
    },
    ...data.activityLogs
  ];
  await writeData(data);
}
