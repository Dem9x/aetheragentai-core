import { z } from "zod";

export const addressSchema = z.string().regex(/^0x[a-fA-F0-9]{40}$/);

export const agentMetadataSchema = z.object({
  name: z.string().min(2).max(80),
  description: z.string().min(8).max(1000),
  agentType: z.string().min(2).max(40),
  skills: z.array(z.string().min(1).max(40)).max(24),
  model: z.string().min(1).max(120),
  publicPromptHash: z.string().regex(/^0x[a-fA-F0-9]{64}$/),
  version: z.string().min(1).max(20),
  ownerAddress: addressSchema
});

export const taskMetadataSchema = z.object({
  title: z.string().min(4).max(160),
  category: z.string().min(2).max(60),
  creatorType: z.enum(["PROTOCOL", "USER", "DAO", "DEVELOPER", "SYSTEM"]).default("USER"),
  creatorName: z.string().min(2).max(120).default("User Project"),
  brief: z.string().min(12).max(4000),
  expectedOutput: z.string().min(8).max(2000),
  validationRules: z.array(z.string().min(2).max(300)).max(32),
  complexity: z.number().int().min(1).max(100),
  creatorAddress: addressSchema,
  creatorLabel: z.string().max(120).optional(),
  rewardToken: z.literal("AAA").default("AAA"),
  rewardAmount: z.number().nonnegative().default(0),
  fundingStatus: z.enum(["UNFUNDED", "PARTIALLY_FUNDED", "FUNDED", "ESCROWED", "ALLOCATED"]).default("UNFUNDED"),
  validationMethod: z.string().min(2).max(120).default("OFFCHAIN_VALIDATION"),
  requiredValidatorQuorum: z.number().int().min(1).max(25).default(3),
  passingScore: z.number().int().min(1).max(100).default(85)
});

export const solutionMetadataSchema = z.object({
  summary: z.string().min(12).max(2000),
  outputURI: z.string().min(4).max(500),
  outputHash: z.string().regex(/^0x[a-fA-F0-9]{64}$/),
  agentId: z.union([z.string(), z.number()]),
  taskId: z.union([z.string(), z.number()]),
  submitterAddress: addressSchema
});

export const validationRunSchema = z.object({
  taskId: z.string().min(1),
  submissionId: z.string().min(1),
  mode: z.enum(["benchmark", "ai_judge", "multi_agent_debate", "human_validator", "consensus"]).default("benchmark"),
  baseReward: z.number().positive(),
  factors: z.object({
    reasoningQuality: z.number().min(0).max(100),
    executionAccuracy: z.number().min(0).max(100),
    taskComplexity: z.number().min(0).max(100),
    solutionEfficiency: z.number().min(0).max(100),
    collaborationEffectiveness: z.number().min(0).max(100),
    innovationScore: z.number().min(0).max(100),
    verificationConfidence: z.number().min(0).max(100),
    agentReputation: z.number().min(0).max(100)
  })
});
