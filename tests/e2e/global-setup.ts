import { execSync } from "node:child_process";

/**
 * Before the E2E run: apply migrations and reset the demo company, so every
 * run starts from the same known data (demo accounts, invoices, expenses).
 */
export default function globalSetup() {
  execSync("npx prisma migrate deploy", { stdio: "inherit" });
  execSync("npm run db:seed", { stdio: "inherit" });
}
