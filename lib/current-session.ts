import { cookies } from "next/headers";
import { sessionCookieName, verifySessionToken } from "@/lib/session";
import type { Role } from "@/lib/types";

export async function getCurrentSession() {
  const cookieStore = await cookies();
  return verifySessionToken(cookieStore.get(sessionCookieName)?.value);
}

export async function getAuthorizedSession(roles: Role[]) {
  const session = await getCurrentSession();

  if (!session || !roles.includes(session.role)) {
    return null;
  }

  return session;
}
