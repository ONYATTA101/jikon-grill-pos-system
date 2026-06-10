import { NextResponse } from "next/server";
import { sessionCookieName } from "@/lib/session";

/**
 * Signs the user out from a browser link by deleting the login cookie and returning to the login
 * screen.
 */
export function GET(request: Request) {
  const response = NextResponse.redirect(new URL("/login", request.url));
  response.cookies.set(sessionCookieName, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NEXTAUTH_URL?.startsWith("https://") ?? false,
    path: "/",
    maxAge: 0
  });

  return response;
}

/**
 * Signs the user out from an application request by deleting the login cookie.
 */
export function POST(request: Request) {
  return GET(request);
}
