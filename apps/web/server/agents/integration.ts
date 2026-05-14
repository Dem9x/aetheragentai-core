import { createHash, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { prisma } from "@/lib/server/prisma";
import type { AgentIntegration, AgentRuntimeType } from "@/types";

export const agentIntegrationSchema = z.object({
  runtimeType: z.enum(["HOSTED", "LOCAL_RUNNER", "AETHER_MANAGED"]),
  agentEndpoint: z.string().url().optional().or(z.literal("")),
  publicKey: z.string().min(8).max(500).optional().or(z.literal("")),
  webhookSecret: z.string().min(12).max(200).optional().or(z.literal("")),
  capabilities: z.array(z.string().min(1).max(50)).max(32).default([])
});

export type AgentIntegrationInput = z.infer<typeof agentIntegrationSchema>;

export function hashSecret(secret: string) {
  return `sha256:${createHash("sha256").update(secret).digest("hex")}`;
}

export function verifySecret(secret: string, storedHash?: string | null) {
  if (!storedHash?.startsWith("sha256:")) return false;
  const candidate = Buffer.from(hashSecret(secret));
  const stored = Buffer.from(storedHash);
  return candidate.length === stored.length && timingSafeEqual(candidate, stored);
}

export async function saveAgentIntegration(agentId: string, input: AgentIntegrationInput) {
  const parsed = agentIntegrationSchema.parse(input);
  const integration: AgentIntegration = {
    runtimeType: parsed.runtimeType as AgentRuntimeType,
    agentEndpoint: parsed.agentEndpoint || undefined,
    publicKey: parsed.publicKey || undefined,
    webhookSecretHash: parsed.webhookSecret ? hashSecret(parsed.webhookSecret) : undefined,
    capabilities: parsed.capabilities,
    status: parsed.runtimeType === "HOSTED" && parsed.agentEndpoint ? "PENDING" : "ACTIVE",
    lastCheckedAt: new Date().toISOString()
  };

  const agentExists = await prisma.agent.findUnique({ where: { id: agentId }, select: { id: true } });
  if (!agentExists) {
    throw new Error("Agent not found. Register the agent in the database before configuring runner integration.");
  }

  await prisma.agentIntegration.upsert({
    where: { agentId },
    create: {
      agentId,
      runtimeType: integration.runtimeType,
      agentEndpoint: integration.agentEndpoint,
      publicKey: integration.publicKey,
      webhookSecretHash: integration.webhookSecretHash,
      capabilities: integration.capabilities,
      status: integration.status,
      lastCheckedAt: new Date()
    },
    update: {
      runtimeType: integration.runtimeType,
      agentEndpoint: integration.agentEndpoint,
      publicKey: integration.publicKey,
      webhookSecretHash: integration.webhookSecretHash,
      capabilities: integration.capabilities,
      status: integration.status,
      lastCheckedAt: new Date()
    }
  });

  return integration;
}

export async function getAgentIntegration(agentId: string) {
  const integration = await prisma.agentIntegration.findUnique({ where: { agentId } });
  if (integration) {
    return {
      runtimeType: integration.runtimeType as AgentRuntimeType,
      agentEndpoint: integration.agentEndpoint ?? undefined,
      publicKey: integration.publicKey ?? undefined,
      webhookSecretHash: integration.webhookSecretHash ?? undefined,
      capabilities: integration.capabilities,
      status: integration.status as AgentIntegration["status"],
      lastCheckedAt: integration.lastCheckedAt?.toISOString()
    };
  }
  return null;
}

export async function testHostedAgent(endpoint: string) {
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      type: "AETHER_AGENT_PING",
      taskId: "healthcheck",
      brief: "Respond with readiness for AetherAgentAI task routing.",
      expectedOutput: "JSON readiness response"
    }),
    signal: AbortSignal.timeout(8000)
  });

  if (!response.ok) {
    throw new Error(`Agent endpoint returned ${response.status}`);
  }

  return response.json().catch(() => ({ ok: true }));
}
