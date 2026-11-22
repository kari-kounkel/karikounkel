import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: { alias: { "@": path.resolve(import.meta.dirname) } },
  test: {
    include: ["tests/**/*.test.ts"],
    fileParallelism: false,
    testTimeout: 60_000,
    env: {
      // Throwaway key for tests only.
      INVITE_KEY: Buffer.alloc(32, 7).toString("base64"),
      TEST_DATABASE_URL: process.env.TEST_DATABASE_URL ?? "postgres://postgres@localhost:54329/party_test",
    },
  },
});
