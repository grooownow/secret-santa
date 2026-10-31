import { afterEach, describe, expect, it, vi } from "vitest";

const afterMock = vi.hoisted(() => vi.fn());
vi.mock("next/server", () => ({ after: afterMock }));

import {
  runAfterResponse,
  setRunAfterResponseForTests,
} from "./run-after-response";

afterEach(() => {
  setRunAfterResponseForTests(null);
  afterMock.mockReset();
});

describe("runAfterResponse", () => {
  it("hands the work to next/server after()", () => {
    const work = vi.fn();
    runAfterResponse(work);
    expect(afterMock).toHaveBeenCalledWith(work);
    expect(work).not.toHaveBeenCalled();
  });

  it("lets tests await the work deterministically", async () => {
    const pending: Promise<unknown>[] = [];
    setRunAfterResponseForTests((w) => pending.push(Promise.resolve(w())));
    let done = false;
    runAfterResponse(async () => {
      await Promise.resolve();
      done = true;
    });
    await Promise.all(pending);
    expect(done).toBe(true);
    expect(afterMock).not.toHaveBeenCalled();
  });

  it("returns to after() once the hook is cleared", () => {
    setRunAfterResponseForTests(() => undefined);
    setRunAfterResponseForTests(null);
    runAfterResponse(() => undefined);
    expect(afterMock).toHaveBeenCalledTimes(1);
  });
});
