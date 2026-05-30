import { config, isProductionLike } from "../config.js";
import { ApiError } from "../utils/errors.js";

export function getRequestWallet(req) {
  const headerAddress = req.get("x-dev-wallet-address");
  const bodyAddress = req.body?.ownerAddress ?? req.body?.walletAddress;
  const address = headerAddress || bodyAddress;
  return typeof address === "string" ? address.toLowerCase() : "";
}

export function requireDevOwner(req) {
  if (isProductionLike()) {
    throw new ApiError(
      501,
      "OWNER_AUTH_NOT_CONFIGURED",
      "Production owner auth is intentionally not mocked. Add SIWE/JWT before using protected owner routes."
    );
  }

  if (config.env === "production") {
    throw new ApiError(401, "DEV_AUTH_DISABLED", "Development owner auth bypass is disabled in production.");
  }

  const ownerAddress = getRequestWallet(req);
  if (!ownerAddress) {
    throw new ApiError(401, "DEV_WALLET_REQUIRED", "Set x-dev-wallet-address for local owner-authenticated requests.");
  }
  return ownerAddress;
}

export function assertAgentOwner(agent, ownerAddress) {
  if (!agent) throw new ApiError(404, "AGENT_NOT_FOUND", "Agent not found.");
  if (agent.ownerAddress?.toLowerCase() !== ownerAddress.toLowerCase()) {
    throw new ApiError(403, "NOT_AGENT_OWNER", "Only the agent owner may change this resource.");
  }
}
