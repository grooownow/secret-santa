import { notFound, redirect } from "next/navigation";
import type { NextRequest } from "next/server";
import { requireVerifiedAccount } from "@/features/auth";
import { participantIdSchema } from "@/features/gift";
import { rememberParticipant } from "@/features/profile";
import { CABINET_HOME, CABINET_GIFT } from "@/lib/cabinet-routes";

// Remembers the chosen participant, then returns to the page it came from.
// Someone else's or a malformed id is a plain 404.
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ participantId: string }> },
) {
  const account = await requireVerifiedAccount();
  const id = participantIdSchema.safeParse((await params).participantId);
  if (!id.success || !(await rememberParticipant(account.id, id.data))) {
    notFound();
  }
  const to = request.nextUrl.searchParams.get("to");
  redirect(to === "gift" ? CABINET_GIFT : CABINET_HOME);
}
