import "server-only";

import { getCurrentSession } from "@/server/api/session";
import { requireAdminSession } from "@/server/api/admin";

export function getValidatorWallets() {
  return (process.env.VALIDATOR_WALLET_ADDRESSES ?? "")
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
}

export async function requireValidatorSession() {
  const session = await getCurrentSession();
  const validators = getValidatorWallets();
  const admin = await requireAdminSession();
  const isValidator = Boolean(session?.address && validators.includes(session.address.toLowerCase()));

  return {
    ok: Boolean(session) && (isValidator || admin.ok),
    configured: validators.length > 0 || admin.configured,
    isValidator,
    isAdmin: admin.ok,
    session,
    validators
  };
}
