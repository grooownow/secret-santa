import { afterEach, describe, expect, it, vi } from "vitest";

const errorMock = vi.fn();
const captureRequestErrorMock = vi.fn();

vi.mock("@/lib/logger", () => ({
  logger: { error: errorMock },
}));

vi.mock("@sentry/nextjs", () => ({
  captureRequestError: captureRequestErrorMock,
}));

describe("onRequestError", () => {
  const originalRuntime = process.env.NEXT_RUNTIME;
  const originalSentryDsn = process.env.SENTRY_DSN;

  afterEach(() => {
    process.env.NEXT_RUNTIME = originalRuntime;
    process.env.SENTRY_DSN = originalSentryDsn;
    errorMock.mockClear();
    captureRequestErrorMock.mockClear();
  });

  it("logs the error with request/route context on the nodejs runtime", async () => {
    process.env.NEXT_RUNTIME = "nodejs";
    const { onRequestError } = await import("./instrumentation");

    const err = new Error("boom");
    const request = {
      path: "/dashboard",
      method: "GET",
      headers: {},
    };
    const context = {
      routerKind: "App Router" as const,
      routePath: "/dashboard",
      routeType: "render" as const,
      revalidateReason: undefined,
    };

    await onRequestError(err, request, context);

    expect(errorMock).toHaveBeenCalledWith(
      expect.objectContaining({
        err,
        path: "/dashboard",
        method: "GET",
        routerKind: "App Router",
        routePath: "/dashboard",
        routeType: "render",
      }),
      "request error",
    );
  });

  it("does not log (and does not import the nodejs-only logger) on the edge runtime", async () => {
    process.env.NEXT_RUNTIME = "edge";
    const { onRequestError } = await import("./instrumentation");

    await onRequestError(
      new Error("boom"),
      { path: "/x", method: "GET", headers: {} },
      {
        routerKind: "App Router",
        routePath: "/x",
        routeType: "render",
        revalidateReason: undefined,
      },
    );

    expect(errorMock).not.toHaveBeenCalled();
  });

  it("does not attempt Sentry capture when SENTRY_DSN is unset", async () => {
    process.env.NEXT_RUNTIME = "nodejs";
    delete process.env.SENTRY_DSN;
    const { onRequestError } = await import("./instrumentation");

    await onRequestError(
      new Error("boom"),
      { path: "/x", method: "GET", headers: {} },
      {
        routerKind: "App Router",
        routePath: "/x",
        routeType: "render",
        revalidateReason: undefined,
      },
    );

    expect(errorMock).toHaveBeenCalled();
    expect(captureRequestErrorMock).not.toHaveBeenCalled();
  });

  it("chains Sentry's captureRequestError alongside pino when SENTRY_DSN is set", async () => {
    process.env.NEXT_RUNTIME = "nodejs";
    process.env.SENTRY_DSN = "https://example.ingest.sentry.io/123";
    const { onRequestError } = await import("./instrumentation");

    const err = new Error("boom");
    const request = { path: "/x", method: "GET", headers: {} };
    const context = {
      routerKind: "App Router" as const,
      routePath: "/x",
      routeType: "render" as const,
      revalidateReason: undefined,
    };

    await onRequestError(err, request, context);

    expect(errorMock).toHaveBeenCalled();
    expect(captureRequestErrorMock).toHaveBeenCalledWith(err, request, context);
  });

  it("still attempts Sentry capture on the edge runtime when SENTRY_DSN is set", async () => {
    process.env.NEXT_RUNTIME = "edge";
    process.env.SENTRY_DSN = "https://example.ingest.sentry.io/123";
    const { onRequestError } = await import("./instrumentation");

    const err = new Error("boom");
    const request = { path: "/x", method: "GET", headers: {} };
    const context = {
      routerKind: "App Router" as const,
      routePath: "/x",
      routeType: "render" as const,
      revalidateReason: undefined,
    };

    await onRequestError(err, request, context);

    expect(errorMock).not.toHaveBeenCalled();
    expect(captureRequestErrorMock).toHaveBeenCalledWith(err, request, context);
  });
});
