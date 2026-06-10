import { cookies } from "next/headers";
import { sessionCookieName, verifySessionToken } from "@/lib/session";
import type { Role } from "@/lib/types";

/**
 * Reads and verifies the login cookie, then returns the current staff member's session or null.
 */
export async function getCurrentSession() {
  const cookieStore = await cookies();
  return verifySessionToken(cookieStore.get(sessionCookieName)?.value);
}

/**
 * Returns the current session only when the staff role is included in the allowed-role list.
 */
export async function getAuthorizedSession(roles: Role[]) {
  const session = await getCurrentSession();

  if (!session || !roles.includes(session.role)) {
    return null;
  }

  return session;
}
