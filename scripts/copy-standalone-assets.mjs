import { chmodSync, cpSync, existsSync, mkdirSync, statSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const standalone = path.join(root, ".next", "standalone");
if (!existsSync(standalone)) {
  console.log("copy-standalone-assets: no .next/standalone, skip");
  process.exit(0);
}

const prismaDest = path.join(standalone, "prisma");
mkdirSync(prismaDest, { recursive: true });

const schemaSrc = path.join(root, "prisma", "schema.prisma");
if (existsSync(schemaSrc)) {
  cpSync(schemaSrc, path.join(prismaDest, "schema.prisma"));
  console.log("copied prisma/schema.prisma");
}

const demoMode =
  process.env.DEMO_MODE === "1" || process.env.DEMO_MODE === "true";
const dbCandidates = [
  path.join(root, "prisma", "data.db"),
  path.join(root, ".layero-assets", "data.db"),
];
const dbSrc = dbCandidates.find((p) => existsSync(p) && statSync(p).size > 1000);
if (dbSrc) {
  cpSync(dbSrc, path.join(prismaDest, "data.db"));
  console.log(`copied ${dbSrc} -> standalone/prisma/data.db (${statSync(dbSrc).size} bytes)`);
} else if (!demoMode) {
  console.error("copy-standalone-assets: data.db not found");
  process.exit(1);
} else {
  console.log("copy-standalone-assets: DEMO_MODE — no sqlite file");
}

const engineName = "query-engine-linux-static-x64";
const engineSrc = path.join(root, "node_modules", ".prisma", "client", engineName);
const engineDestDir = path.join(standalone, "node_modules", ".prisma", "client");
if (existsSync(engineSrc)) {
  mkdirSync(engineDestDir, { recursive: true });
  const engineDest = path.join(engineDestDir, engineName);
  cpSync(engineSrc, engineDest);
  chmodSync(engineDest, 0o755);
  console.log(`copied ${engineName} (chmod +x)`);
} else {
  console.warn(`copy-standalone-assets: ${engineName} missing`);
}
