import { apiError, apiSuccess } from "@/lib/api/response";

export async function POST() {
  if (!process.env.VALIDATOR_PRIVATE_KEY || !process.env.NEXT_PUBLIC_VALIDATION_REGISTRY_ADDRESS) {
    return apiError(
      "ONCHAIN_VALIDATOR_NOT_CONFIGURED",
      "On-chain validation submission requires VALIDATOR_PRIVATE_KEY and NEXT_PUBLIC_VALIDATION_REGISTRY_ADDRESS. Do not use mainnet funds before audit.",
      503
    );
  }

  return apiSuccess({
    queued: true,
    safety: "testnet only until audited",
    note: "Wire this endpoint to viem walletClient.writeContract after validator signer custody is configured."
  });
}
