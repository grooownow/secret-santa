import { after } from "next/server";

type Work = () => Promise<unknown> | unknown;
type Runner = (work: Work) => void;

let override: Runner | null = null;

/**
 * Runs `work` after the response has been sent (Next.js `after()`), so a slow
 * job such as a mass mailing does not block the request. Outside a request
 * scope, tests install a runner via `setRunAfterResponseForTests`.
 */
export function runAfterResponse(work: Work): void {
  if (override) {
    override(work);
    return;
  }
  after(work);
}

/** Test hook: pass a runner to take over, or `null` to restore `after()`. */
export function setRunAfterResponseForTests(runner: Runner | null): void {
  override = runner;
}
