import "server-only";

import { getCurrentSession } from "@/server/api/session";

export function getAdminWallets() {
  return (process.env.ADMIN_WALLET_ADDRESSES ?? "")
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
}

export async function requireAdminSession() {
  const session = await getCurrentSession();
  const admins = getAdminWallets();
  const configured = admins.length > 0;
  const isAdmin = Boolean(session?.address && admins.includes(session.address.toLowerCase()));

  return {
    ok: configured && isAdmin,
    configured,
    isAdmin,
    session,
    admins
  };
}
