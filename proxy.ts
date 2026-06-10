import { NextRequest, NextResponse } from "next/server";
import type { Role } from "@/lib/types";

const sessionCookieName = "jikon_session";

type SessionPayload = {
  userId: string;
  email: string;
  name: string;
  role: Role;
  exp: number;
};

const roleStarts: Record<Role, string> = {
  OWNER: "/owner/dashboard",
  MANAGER: "/dashboard",
  CASHIER: "/pos",
  WAITER: "/tables",
  KITCHEN: "/kitchen",
  BARTENDER: "/bar",
  ADMIN: "/staff"
};

const accessRules: Array<{ prefix: string; roles: Role[] }> = [
  { prefix: "/api/orders", roles: ["OWNER", "MANAGER", "CASHIER", "WAITER", "KITCHEN", "BARTENDER"] },
  { prefix: "/api/products", roles: ["OWNER", "MANAGER", "CASHIER", "WAITER"] },
  { prefix: "/api/sales", roles: ["OWNER", "MANAGER", "CASHIER"] },
  { prefix: "/owner", roles: ["OWNER"] },
  { prefix: "/dashboard", roles: ["OWNER", "MANAGER"] },
  { prefix: "/closing", roles: ["OWNER", "MANAGER"] },
  { prefix: "/products", roles: ["OWNER", "MANAGER"] },
  { prefix: "/inventory", roles: ["OWNER", "MANAGER"] },
  { prefix: "/stock-adjustments", roles: ["OWNER", "MANAGER"] },
  { prefix: "/suppliers", roles: ["OWNER", "MANAGER"] },
  { prefix: "/expenses", roles: ["OWNER", "MANAGER"] },
  { prefix: "/staff", roles: ["OWNER", "MANAGER", "ADMIN"] },
  { prefix: "/settings", roles: ["OWNER", "MANAGER", "ADMIN"] },
  { prefix: "/pos", roles: ["OWNER", "MANAGER", "CASHIER", "WAITER"] },
  { prefix: "/tables", roles: ["OWNER", "MANAGER", "CASHIER", "WAITER"] },
  { prefix: "/orders", roles: ["OWNER", "MANAGER", "CASHIER", "WAITER"] },
  { prefix: "/kitchen", roles: ["OWNER", "MANAGER", "KITCHEN"] },
  { prefix: "/bar", roles: ["OWNER", "MANAGER", "BARTENDER"] },
  { prefix: "/receipt", roles: ["OWNER", "MANAGER", "CASHIER"] }
];

function base64UrlToBytes(value: string) {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes;
}

function bytesToBase64Url(bytes: ArrayBuffer) {
  let binary = "";
  const array = new Uint8Array(bytes);

  for (let index = 0; index < array.length; index += 1) {
    binary += String.fromCharCode(array[index]);
  }

  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

async function sign(value: string) {
  const configuredSecret = process.env.NEXTAUTH_SECRET;
  const secret =
    configuredSecret && configuredSecret !== "replace-with-a-long-random-secret"
      ? configuredSecret
      : process.env.NODE_ENV === "production"
        ? null
        : "jikon-grill-local-dev-secret";

  if (!secret) {
    throw new Error("NEXTAUTH_SECRET must be set to a strong unique value in production.");
  }

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value));

  return bytesToBase64Url(signature);
}

async function verifySessionToken(token?: string | null): Promise<SessionPayload | null> {
  if (!token) return null;

  const [encodedPayload, signature] = token.split(".");
  if (!encodedPayload || !signature || (await sign(encodedPayload)) !== signature) {
    return null;
  }

  try {
    const payload = JSON.parse(new TextDecoder().decode(base64UrlToBytes(encodedPayload))) as SessionPayload;

    if (!payload.exp || payload.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

function findRule(pathname: string) {
  return accessRules.find((rule) => pathname === rule.prefix || pathname.startsWith(`${rule.prefix}/`));
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (pathname.startsWith("/api/auth")) return NextResponse.next();

  const session = await verifySessionToken(request.cookies.get(sessionCookieName)?.value);

  if (pathname === "/login") {
    if (!session) return NextResponse.next();

    return NextResponse.redirect(new URL(roleStarts[session.role], request.url));
  }

  const rule = findRule(pathname);
  if (!rule) return NextResponse.next();

  if (!session) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (!rule.roles.includes(session.role)) {
    return NextResponse.redirect(new URL(roleStarts[session.role], request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"]
};
