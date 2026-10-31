import { NextRequest } from "next/server";
import type { Session } from "next-auth";
import { describe, expect, it } from "vitest";
import { buildAuthConfig, buildProviders, providerIdsFor } from "./auth.config";

const authenticatedSession: Session = {
  user: { id: "user-1", email: "a@gridfin.dev" },
  expires: "2099-01-01T00:00:00.000Z",
};

describe("authConfig.callbacks.authorized", () => {
  const cases: Array<{
    name: string;
    path: string;
    auth: Session | null;
    expected: boolean;
    devBypass?: boolean;
  }> = [
    {
      name: "/home, no auth",
      path: "/home",
      auth: null,
      expected: false,
    },
    {
      name: "/home, authenticated",
      path: "/home",
      auth: authenticatedSession,
      expected: true,
    },
    {
      name: "/admin, no auth",
      path: "/admin",
      auth: null,
      expected: false,
    },
    {
      name: "/admin/sub, authenticated",
      path: "/admin/sub",
      auth: authenticatedSession,
      expected: true,
    },
    {
      name: "/dashboard, no auth (no longer protected)",
      path: "/dashboard",
      auth: null,
      expected: true,
    },
    { name: "/, no auth", path: "/", auth: null, expected: true },
    {
      name: "/home/sub, no auth",
      path: "/home/sub",
      auth: null,
      expected: false,
    },
    {
      name: "/home, no auth, dev bypass on",
      path: "/home",
      auth: null,
      expected: true,
      devBypass: true,
    },
  ];

  it.each(cases)(
    "$name -> $expected",
    ({ path, auth, expected, devBypass }) => {
      const { authorized } = buildAuthConfig(
        {},
        { devBypass: devBypass ?? false },
      ).callbacks!;
      const request = new NextRequest(new URL(path, "http://localhost"));

      expect(authorized!({ auth, request })).toBe(expected);
    },
  );
});

describe("buildAuthConfig", () => {
  it("configures a custom sign-in page at /signin", () => {
    expect(buildAuthConfig({}).pages?.signIn).toBe("/signin");
  });
});

describe("buildProviders", () => {
  it("is empty when no provider env vars are set", () => {
    expect(buildProviders({})).toHaveLength(0);
  });

  it("includes github when AUTH_GITHUB_ID and AUTH_GITHUB_SECRET are set", () => {
    const providers = buildProviders({
      AUTH_GITHUB_ID: "gh-id",
      AUTH_GITHUB_SECRET: "gh-secret",
    });

    expect(
      providerIdsFor({
        AUTH_GITHUB_ID: "gh-id",
        AUTH_GITHUB_SECRET: "gh-secret",
      }),
    ).toEqual(["github"]);
    expect(providers).toHaveLength(1);
  });

  it("omits github when only one of the id/secret pair is set", () => {
    expect(buildProviders({ AUTH_GITHUB_ID: "gh-id" })).toHaveLength(0);
  });

  it("includes google when AUTH_GOOGLE_ID and AUTH_GOOGLE_SECRET are set", () => {
    expect(
      providerIdsFor({
        AUTH_GOOGLE_ID: "g-id",
        AUTH_GOOGLE_SECRET: "g-secret",
      }),
    ).toEqual(["google"]);
  });

  it("includes both when all four vars are set", () => {
    expect(
      providerIdsFor({
        AUTH_GITHUB_ID: "gh-id",
        AUTH_GITHUB_SECRET: "gh-secret",
        AUTH_GOOGLE_ID: "g-id",
        AUTH_GOOGLE_SECRET: "g-secret",
      }),
    ).toEqual(["github", "google"]);
  });
});
