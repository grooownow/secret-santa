import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { runDaily } from "@/features/game";
import { env } from "@/lib/env";

// Fluid Compute on Hobby allows up to 300 s; the broadcasts are sequential.
export const maxDuration = 300;
export const dynamic = "force-dynamic";

function authorized(request: Request): boolean {
  const secret = env.CRON_SECRET;
  // Never run unauthenticated in production, even if the secret is missing.
  if (!secret) return env.NODE_ENV !== "production";
  const given = Buffer.from(request.headers.get("authorization") ?? "");
  const expected = Buffer.from(`Bearer ${secret}`);
  return given.length === expected.length && timingSafeEqual(given, expected);
}

// Vercel Cron calls GET with `Authorization: Bearer $CRON_SECRET`. No input
// from the request is used.
export async function GET(request: Request) {
  if (!authorized(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const report = await runDaily(new Date());
  return NextResponse.json(report, { status: report.failed ? 500 : 200 });
}
