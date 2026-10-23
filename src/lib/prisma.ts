import { copyFileSync, existsSync, mkdirSync } from "fs";
import path from "path";
import { PrismaClient } from "@prisma/client";

/**
 * Layero free runtime has no libssl.so — force the statically linked query
 * engine binary (engineType = "binary" + linux-static-x64).
 */
function preferStaticQueryEngineBinary() {
  if (process.platform !== "linux") return;
  if (process.env.PRISMA_QUERY_ENGINE_BINARY) return;

  const names = ["query-engine-linux-static-x64"];
  const roots = [
    path.join(process.cwd(), "node_modules", ".prisma", "client"),
    path.join(process.cwd(), "node_modules", "@prisma", "engines"),
  ];
  for (const root of roots) {
    for (const name of names) {
      const file = path.join(root, name);
      if (existsSync(file)) {
        process.env.PRISMA_QUERY_ENGINE_BINARY = file;
        return;
      }
    }
  }
}

/**
 * SQLite on Layero: bake schema into prisma/data.db at build time, then copy
 * to /tmp so the runtime can write.
 */
function ensureWritableSqlite() {
  const url = process.env.DATABASE_URL || "";
  if (!url.startsWith("file:")) return;

  const targetPath = url.replace(/^file:/, "");
  if (!targetPath.startsWith("/tmp/")) return;
  if (existsSync(targetPath)) return;

  const baked = path.join(process.cwd(), "prisma", "data.db");
  if (!existsSync(baked)) return;

  mkdirSync(path.dirname(targetPath), { recursive: true });
  copyFileSync(baked, targetPath);
}

preferStaticQueryEngineBinary();
ensureWritableSqlite();

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
