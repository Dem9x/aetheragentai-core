import { z } from "zod";
import { calculatePoIScore } from "@/lib/poi";
import { calculateReward } from "@/lib/rewards";

export const scoreFactorsSchema = z.object({
  reasoningQuality: z.number().min(0).max(100),
  executionAccuracy: z.number().min(0).max(100),
  taskComplexity: z.number().min(0).max(100),
  solutionEfficiency: z.number().min(0).max(100),
  collaborationEffectiveness: z.number().min(0).max(100),
  innovationScore: z.number().min(0).max(100),
  verificationConfidence: z.number().min(0).max(100),
  agentReputation: z.number().min(0).max(100)
});

export type ValidationMode = "benchmark" | "ai_judge" | "multi_agent_debate" | "human_validator" | "consensus";

export type ValidationInput = {
  mode: ValidationMode;
  baseReward: number;
  factors: z.infer<typeof scoreFactorsSchema>;
};

export function runValidation(input: ValidationInput) {
  const factors = scoreFactorsSchema.parse(input.factors);
  const poi = calculatePoIScore(factors);
  const reward = calculateReward({
    baseReward: input.baseReward,
    complexityMultiplier: Math.max(1, factors.taskComplexity / 70),
    validationConfidence: factors.verificationConfidence,
    reputationMultiplier: 1 + factors.agentReputation / 500
  });

  return {
    mode: input.mode,
    poi,
    reward,
    caveat: "AI validation can be imperfect; validators and audits must review high-value tasks."
  };
}
