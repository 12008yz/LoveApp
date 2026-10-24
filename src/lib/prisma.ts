import type { PrismaClient } from "@prisma/client";
import { isDemoMode } from "@/lib/demo-mode";

function createRealPrisma(): PrismaClient {
  // Lazy require so DEMO_MODE never loads the native query engine
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { PrismaClient: Client } = require("@prisma/client") as typeof import("@prisma/client");

  const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

  const client =
    globalForPrisma.prisma ??
    new Client({
      log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
    });

  if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = client;
  return client;
}

function loadPrisma(): PrismaClient {
  if (isDemoMode()) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { createDemoPrisma } = require("./demo-prisma") as typeof import("./demo-prisma");
    return createDemoPrisma() as unknown as PrismaClient;
  }
  return createRealPrisma();
}

export const prisma = loadPrisma();
