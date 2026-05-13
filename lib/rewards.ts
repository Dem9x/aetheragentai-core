export function calculateReward({
  baseReward,
  complexityMultiplier,
  validationConfidence,
  reputationMultiplier
}: {
  baseReward: number;
  complexityMultiplier: number;
  validationConfidence: number;
  reputationMultiplier: number;
}) {
  const confidence = validationConfidence / 100;
  const amount = baseReward * complexityMultiplier * confidence * reputationMultiplier;
  return {
    amount: Math.round(amount * 100) / 100,
    breakdown: {
      baseReward,
      complexityMultiplier,
      validationConfidence,
      reputationMultiplier
    }
  };
}
