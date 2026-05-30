import "server-only";

import {
  getApiAgent,
  getApiNetworkOverview,
  getApiTaskWithSubmissions,
  listApiAgents,
  listApiRewards,
  listApiTasks
} from "@/lib/server/api-data";

export const listAgents = listApiAgents;
export const getAgent = getApiAgent;
export const listTasks = listApiTasks;
export const getTaskWithSubmissions = getApiTaskWithSubmissions;
export const listRewards = listApiRewards;
export const getNetworkOverview = getApiNetworkOverview;
export const listRunnerTasks = listApiTasks;

export async function getTask(id: string) {
  return (await getApiTaskWithSubmissions(id)).task;
}

export async function createAgent() {
  throw new Error("createAgent moved to apps/api. Use POST /api/agents.");
}

export async function createTask() {
  throw new Error("createTask moved to apps/api. Use POST /api/tasks.");
}

export async function createSubmission() {
  throw new Error("createSubmission moved to apps/api. Use signed POST /api/runner/submissions.");
}

export async function assignAgentToTask() {
  return null;
}
