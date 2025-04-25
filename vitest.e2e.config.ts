import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["test/**/*.e2e.test.ts"],
    testTimeout: 10000, // Longer timeout for E2E tests
  },
});
