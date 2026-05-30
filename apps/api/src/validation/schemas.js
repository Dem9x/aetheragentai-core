import { z } from "zod";

const addressSchema = z.string().regex(/^0x[a-fA-F0-9]{40}$/, "Expected an EVM wallet address");
const hashSchema = z.string().regex(/^0x[a-fA-F0-9]{64}$/, "Expected a 0x-prefixed SHA-256 hash").optional();

export const createAgentSchema = z.object({
  ownerAddress: addressSchema.optional(),
  name: z.string().min(2).max(120),
  description: z.string().max(1000).optional(),
  agentType: z.string().min(2).max(80),
  metadataURI: z.string().max(500).optional(),
  metadataHash: hashSchema,
  metadata: z.unknown().optional()
});

export const integrationSchema = z.object({
  runtimeType: z.enum(["LOCAL_RUNNER", "HOSTED", "AETHER_MANAGED"]).default("LOCAL_RUNNER"),
  agentEndpoint: z.string().url().optional().or(z.literal("")),
  publicKey: z.string().min(32).optional().or(z.literal("")),
  runnerSecret: z.string().min(16).optional().or(z.literal("")),
  capabilities: z.array(z.string().min(1).max(80)).default([]),
  status: z.enum(["UNCONFIGURED", "PENDING", "ACTIVE", "FAILED"]).default("ACTIVE")
});

export const createTaskSchema = z.object({
  creatorType: z.enum(["PROTOCOL", "USER", "DAO", "DEVELOPER", "SYSTEM"]).default("PROTOCOL"),
  creatorName: z.string().max(120).optional(),
  creatorAddress: addressSchema.optional(),
  creatorLabel: z.string().max(160).optional(),
  title: z.string().min(4).max(180),
  brief: z.string().max(5000).optional(),
  category: z.string().min(2).max(80),
  metadataURI: z.string().max(500).optional(),
  metadataHash: hashSchema,
  metadata: z.unknown().optional(),
  inputURI: z.string().max(500).optional(),
  inputHash: hashSchema,
  expectedOutputSchema: z.unknown().optional(),
  rewardAmount: z.number().nonnegative().default(0),
  deadline: z.string().datetime().optional(),
  validationMethod: z.string().max(120).default("MANUAL_VALIDATOR"),
  requiredValidatorQuorum: z.number().int().min(1).max(25).default(3),
  passingScore: z.number().min(0).max(100).default(80)
});

export const runnerSubmissionSchema = z.object({
  taskId: z.string().min(1),
  summary: z.string().max(3000).optional(),
  outputURI: z.string().max(500).optional(),
  outputHash: hashSchema,
  outputPayload: z.unknown().optional()
}).refine((value) => Boolean(value.outputURI && value.outputHash) || value.outputPayload !== undefined, {
  message: "Provide outputURI/outputHash or outputPayload"
});

export const validationSchema = z.object({
  submissionId: z.string().min(1),
  validatorAddress: addressSchema.optional(),
  score: z.number().min(0).max(100),
  confidence: z.number().min(0).max(100),
  reason: z.string().max(4000).optional(),
  resultURI: z.string().max(500).optional(),
  resultHash: hashSchema,
  resultPayload: z.unknown().optional()
});

export const finalizeRewardSchema = z.object({
  submissionId: z.string().min(1),
  finalizerAddress: addressSchema.optional(),
  amount: z.number().nonnegative().optional()
});

export function parseBody(schema, body) {
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    const details = parsed.error.issues.map((issue) => ({
      path: issue.path.join("."),
      message: issue.message
    }));
    const error = new Error("Request validation failed");
    error.status = 400;
    error.code = "VALIDATION_ERROR";
    error.details = details;
    throw error;
  }
  return parsed.data;
}
