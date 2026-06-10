import { NextResponse } from "next/server";
import { sessionCookieName } from "@/lib/session";

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

export function POST(request: Request) {
  return GET(request);
}
