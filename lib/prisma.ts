import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

const cloudDatabaseUrl = process.env.VERCEL ? process.env.DIRECT_URL : undefined;

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient(cloudDatabaseUrl ? { datasources: { db: { url: cloudDatabaseUrl } } } : undefined);

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
