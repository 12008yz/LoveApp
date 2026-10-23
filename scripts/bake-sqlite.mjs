import { execSync } from "node:child_process";

process.env.DATABASE_URL = "file:./prisma/data.db";
execSync("npx prisma db push", { stdio: "inherit", env: process.env });
