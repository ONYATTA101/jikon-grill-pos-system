import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * Checks that the application can reach its database and returns a simple service-health response.
 */
export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;

    return NextResponse.json({
      status: "ok",
      database: "connected",
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("Database health check failed.", error);
    return NextResponse.json(
      {
        status: "error",
        database: "unavailable",
        timestamp: new Date().toISOString()
      },
      { status: 503 }
    );
  }
}
