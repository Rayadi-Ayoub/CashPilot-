import { execSync } from "node:child_process";
import { rmSync } from "node:fs";
import path from "node:path";

/**
 * Avant tous les tests : recrée une base SQLite de test vide (prisma/test.db)
 * et y applique toutes les migrations. La base de démo dev.db n'est jamais modifiée.
 */
export default function setup() {
  const databaseUrl = "file:./test.db";
  for (const suffix of ["", "-journal", "-wal", "-shm"]) {
    rmSync(path.join(process.cwd(), "prisma", `test.db${suffix}`), { force: true });
  }
  execSync("npx prisma migrate deploy", { stdio: "inherit", env: { ...process.env, DATABASE_URL: databaseUrl } });
}
