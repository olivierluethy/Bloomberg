import { defineConfig } from "vitest/config";

/**
 * Unit tests for the pure layers — the maths and the data generators.
 *
 * Deliberately node-environment and component-free: the UI is verified by
 * driving the real app in a browser, which catches what a mounted-component
 * test can't (an invisible chart, a container collapsed to zero height, a
 * hydration mismatch). These cover what a browser can't check for you — that
 * FIFO is really FIFO, and that the simulated data holds its invariants.
 *
 * `@/…` resolves from tsconfig's paths, which Vite reads natively.
 */
export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
