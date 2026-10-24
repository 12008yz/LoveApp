import { execSync } from "node:child_process";
import { existsSync, mkdirSync, statSync, copyFileSync } from "node:fs";
import path from "node:path";

if (process.env.DEMO_MODE === "1" || process.env.DEMO_MODE === "true") {
  console.log("bake-sqlite: DEMO_MODE — skip database");
  process.exit(0);
}

const root = process.cwd();
const dbPath = path.join(root, "prisma", "data.db");
const url = `file:${dbPath.replace(/\\/g, "/")}`;

process.env.DATABASE_URL = url;
execSync("npx prisma db push", { stdio: "inherit", env: process.env });

if (!existsSync(dbPath) || statSync(dbPath).size < 1000) {
  console.error("bake-sqlite: prisma/data.db missing or too small after db push");
  process.exit(1);
}

console.log(`bake-sqlite: ok ${dbPath} (${statSync(dbPath).size} bytes)`);

// Stash a copy Layero/gitignore cannot strip mid-build
const stashDir = path.join(root, ".layero-assets");
mkdirSync(stashDir, { recursive: true });
copyFileSync(dbPath, path.join(stashDir, "data.db"));
console.log("bake-sqlite: stashed .layero-assets/data.db");
