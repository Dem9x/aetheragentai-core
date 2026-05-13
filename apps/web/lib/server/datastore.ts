import "server-only";

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { Agent, AppData, TaskSubmission } from "@/types";
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

async function ensureDataFile() {
  await mkdir(dataDirectory, { recursive: true });

  try {
    await readFile(dataFile, "utf8");
  } catch {
    await writeFile(dataFile, JSON.stringify(seedData(), null, 2), "utf8");
  }
}

export async function readData(): Promise<AppData> {
  await ensureDataFile();
  const raw = await readFile(dataFile, "utf8");
  return { ...seedData(), ...JSON.parse(raw) } as AppData;
}

export async function writeData(data: AppData) {
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
    return { ...task, status: "Validating", submittedAgents };
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
