import { NextResponse } from "next/server";
import { clearLoginFailures, checkLoginAllowed, recordLoginFailure } from "@/lib/login-rate-limit";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/password";
import { createSessionToken, getRoleStart, sessionCookieName } from "@/lib/session";
import type { Role } from "@/lib/types";

/**
 * Authenticates a username or email and password, rate-limits failures, and creates the secure login
 * cookie on success.
 */
export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { email?: string; password?: string } | null;
  const email = body?.email?.trim().toLowerCase();
  const password = body?.password ?? "";
  const clientAddress = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  const attemptKey = `${clientAddress}:${email || "unknown"}`;

  if (!email || !password) {
    return NextResponse.json({ error: "Username and password are required." }, { status: 400 });
  }

  const loginCheck = checkLoginAllowed(attemptKey);
  if (!loginCheck.allowed) {
    return NextResponse.json(
      { error: "Too many failed sign-in attempts. Try again later." },
      {
        status: 429,
        headers: {
          "Retry-After": String(loginCheck.retryAfterSeconds)
        }
      }
    );
  }

  const user = await prisma.user.findUnique({
    where: { email },
    include: { role: true }
  });

  if (!user || user.status !== "ACTIVE") {
    recordLoginFailure(attemptKey);
    return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
  }

  const passwordOk = await verifyPassword(password, user.passwordHash);
  if (!passwordOk) {
    recordLoginFailure(attemptKey);
    return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
  }

  clearLoginFailures(attemptKey);

  const role = user.role.name as Role;
  const token = createSessionToken({
    userId: user.id,
    email: user.email,
    name: user.name,
    role
  });
  const response = NextResponse.json({ start: getRoleStart(role), role, name: user.name });

  response.cookies.set(sessionCookieName, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NEXTAUTH_URL?.startsWith("https://") ?? false,
    path: "/",
    maxAge: 60 * 60 * 24 * 7
  });

  return response;
}
