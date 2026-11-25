import { defineConfig } from "vitest/config";

export default defineConfig({
  // Résout les imports "@/..." définis dans tsconfig.json.
  resolve: { tsconfigPaths: true },
  test: {
    environment: "node",
    include: ["tests/unit/**/*.test.ts", "tests/integration/**/*.test.ts"],
    // Base SQLite séparée : les tests ne touchent jamais prisma/dev.db.
    env: { DATABASE_URL: "file:./test.db" },
    globalSetup: ["tests/setup/global-setup.ts"],
    // SQLite n'accepte qu'un écrivain à la fois : les fichiers s'exécutent l'un après l'autre.
    fileParallelism: false,
    testTimeout: 30000,
    hookTimeout: 60000,
    coverage: {
      provider: "v8",
      include: ["lib/**/*.ts"],
      exclude: ["lib/actions/**"],
      reporter: ["text", "html"],
      reportsDirectory: "coverage",
    },
  },
});
