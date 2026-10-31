// Setup for the "component" vitest project (jsdom environment). Adds
// jest-dom's DOM-specific matchers (toBeVisible, toHaveAttribute, etc.) to
// vitest's `expect` for Testing Library assertions.
import "@testing-library/jest-dom/vitest";
import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

// `test.globals` is intentionally off (see vitest.config.ts), so
// Testing Library's auto-cleanup — which only registers itself when
// `afterEach` exists as a global — never fires on its own. Unmount after
// every test explicitly so component tests don't leak DOM/state into the
// next test in the same file.
afterEach(() => {
  cleanup();
});
