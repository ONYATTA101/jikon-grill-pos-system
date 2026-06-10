import { createHmac } from "crypto";
import type { Role } from "@/lib/types";

export const sessionCookieName = "jikon_session";

export type SessionPayload = {
  userId: string;
  email: string;
  name: string;
  role: Role;
  exp: number;
};

const oneDaySeconds = 60 * 60 * 24;

/**
 * Reads the private server secret used to sign login sessions and rejects unsafe production
 * configuration.
 */
function getSessionSecret() {
  const secret = process.env.NEXTAUTH_SECRET;

  if (secret && secret !== "replace-with-a-long-random-secret") {
    return secret;
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error("NEXTAUTH_SECRET must be set to a strong unique value in production.");
  }

  return "jikon-grill-local-dev-secret";
}

/**
 * Encodes session data into a URL-safe text format for storage inside a cookie.
 */
function base64UrlEncode(value: string) {
  return Buffer.from(value, "utf8").toString("base64url");
}

/**
 * Decodes URL-safe session text back into its original JSON content.
 */
function base64UrlDecode(value: string) {
  return Buffer.from(value, "base64url").toString("utf8");
}

/**
 * Creates the trusted signature that prevents a user from editing their own login cookie.
 */
function sign(value: string) {
  return createHmac("sha256", getSessionSecret()).update(value).digest("base64url");
}

/**
 * Creates a signed, expiring login token containing a staff member's identity and role.
 */
export function createSessionToken(payload: Omit<SessionPayload, "exp">, days = 7) {
  const session: SessionPayload = {
    ...payload,
    exp: Math.floor(Date.now() / 1000) + days * oneDaySeconds
  };
  const encodedPayload = base64UrlEncode(JSON.stringify(session));
  const signature = sign(encodedPayload);

  return `${encodedPayload}.${signature}`;
}

/**
 * Validates a signed login token and returns its staff-session details when it is trustworthy and
 * unexpired.
 */
export function verifySessionToken(token?: string | null): SessionPayload | null {
  if (!token) return null;

  const [encodedPayload, signature] = token.split(".");
  if (!encodedPayload || !signature || sign(encodedPayload) !== signature) {
    return null;
  }

  try {
    const payload = JSON.parse(base64UrlDecode(encodedPayload)) as SessionPayload;

    if (!payload.exp || payload.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

/**
 * Chooses the first screen a staff member should see after login based on their role.
 */
export function getRoleStart(role: Role) {
  const starts: Record<Role, string> = {
    OWNER: "/owner/dashboard",
    MANAGER: "/dashboard",
    CASHIER: "/pos",
    WAITER: "/tables",
    KITCHEN: "/kitchen",
    BARTENDER: "/bar",
    ADMIN: "/staff"
  };

  return starts[role];
}
