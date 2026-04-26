import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { defineConfig } from "vitest/config";

// Load .env.test into process.env before vitest spawns any workers, so both
// globalSetup and the test workers see DATABASE_URL.
try {
  const content = readFileSync(resolve(process.cwd(), ".env.test"), "utf8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq);
    if (!process.env[key]) process.env[key] = trimmed.slice(eq + 1);
  }
} catch {
  // .env.test missing — globalSetup will fail with a clear message
}

export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    globalSetup: ["./tests/setup/global.ts"],
    setupFiles: ["./tests/setup/per-test.ts"],
    fileParallelism: false,
  },
});
