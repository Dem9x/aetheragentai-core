import { cookies } from "next/headers";
import { SESSION_COOKIE, verifySession } from "@/server/api/auth";

export async function getCurrentSession() {
  const cookieStore = await cookies();
  return verifySession(cookieStore.get(SESSION_COOKIE)?.value);
}
