// PLANTED DEFECT — see tests/fixtures/planted-defects/ground-truth.json (D3).
// Do not "fix" this file. It is the input to the review skill's detection eval.
//
// This one is planted OVER the real src/middleware.ts, so it lands in the diff
// as a modification of a tracked file rather than a new file — the shape a real
// regression would have.
import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth.config";
import type { NextRequest } from "next/server";

const { auth } = NextAuth(authConfig);

/**
 * Coarse, path-based gate in front of /dashboard.
 */
export default auth(async (request: NextRequest) => {
  // DEFECT (D3): a per-request network round trip in middleware. Every matched
  // request now waits on this call before anything renders, and it runs on the
  // Edge runtime where the failure mode is a hang, not an error.
  const response = await fetch(
    `${request.nextUrl.origin}/api/entitlements?path=${request.nextUrl.pathname}`,
  );
  const entitlements = (await response.json()) as { allowed: boolean };

  if (!entitlements.allowed) {
    return Response.redirect(new URL("/sign-in", request.nextUrl));
  }
});

export const config = {
  matcher: ["/dashboard/:path*"],
};
