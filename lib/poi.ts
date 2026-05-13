import type { PoIScore } from "@/types";

type PoIInput = {
  reasoningQuality: number;
  executionAccuracy: number;
  taskComplexity: number;
  solutionEfficiency: number;
  collaborationEffectiveness: number;
  innovationScore: number;
  verificationConfidence: number;
  agentReputation: number;
};

const weights: Record<keyof PoIInput, number> = {
  reasoningQuality: 0.18,
  executionAccuracy: 0.2,
  taskComplexity: 0.14,
  solutionEfficiency: 0.11,
  collaborationEffectiveness: 0.1,
  innovationScore: 0.09,
  verificationConfidence: 0.11,
  agentReputation: 0.07
};

export function calculatePoIScore(input: PoIInput): PoIScore {
  const components = Object.fromEntries(
    Object.entries(input).map(([key, value]) => [key, Math.max(0, Math.min(100, Math.round(value)))])
  ) as Record<string, number>;

  const totalScore = Math.round(
    Object.entries(input).reduce((sum, [key, value]) => sum + value * weights[key as keyof PoIInput], 0) * 10
  ) / 10;

  const grade = totalScore >= 94 ? "S" : totalScore >= 86 ? "A" : totalScore >= 76 ? "B" : totalScore >= 64 ? "C" : "D";

  return {
    totalScore,
    grade,
    components,
    explanation:
      "PoI weights useful intelligence: verified accuracy, reasoning quality, complexity handled, efficiency, collaboration, novelty, confidence, and earned reputation."
  };
}
