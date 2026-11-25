import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

// Unit tests only. DB-bound modules are excluded from the coverage scope
// because they are exercised by the integration tests (tests/integration/).
export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: "node",
    include: ["tests/unit/**/*.test.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      reportsDirectory: "coverage",
      include: ["lib/**/*.ts"],
      exclude: ["lib/actions/**", "lib/db.ts", "lib/auth.ts", "lib/cash.ts", "lib/simulation.ts"],
    },
  },
});
