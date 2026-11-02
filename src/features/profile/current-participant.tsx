import { cookies } from "next/headers";
import { getTranslations } from "next-intl/server";
import { UsersRound } from "lucide-react";
import Link from "next/link";
import { switchPath } from "@/lib/cabinet-routes";
import {
  getOwnParticipant,
  listParticipants,
  type Participant,
} from "./queries";

export const CURRENT_PARTICIPANT_COOKIE = "participant";
const MAX_AGE = 60 * 60 * 24 * 60;

/**
 * The participant whose cabinet is shown: the one remembered in the cookie if
 * it still belongs to the account, otherwise the account owner (the adult is
 * listed first). A foreign or stale id in the cookie is ignored.
 */
export async function getCurrentParticipant(
  userId: string,
  people?: Participant[],
): Promise<Participant | null> {
  const all = people ?? (await listParticipants(userId));
  const remembered = (await cookies()).get(CURRENT_PARTICIPANT_COOKIE)?.value;
  return all.find((person) => person.id === remembered) ?? all[0] ?? null;
}

/** Remembers the choice; false (nothing stored) for an id that is not the account's. */
export async function rememberParticipant(
  userId: string,
  id: string,
): Promise<boolean> {
  if (!(await getOwnParticipant(userId, id))) return false;
  (await cookies()).set(CURRENT_PARTICIPANT_COOKIE, id, {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    maxAge: MAX_AGE,
  });
  return true;
}

/**
 * «Сейчас играет: Катя · Сменить»: a mint bar above the tab content, only for
 * accounts with several participants, so it is always clear whose recipient
 * and gift are shown.
 */
export async function CurrentSwitch({
  userId,
  personId,
  to,
}: {
  userId: string;
  personId: string;
  to: "home" | "gift" | "profile";
}) {
  const people = await listParticipants(userId);
  const current = people.find((person) => person.id === personId);
  if (people.length < 2 || !current) return null;
  const t = await getTranslations("cabinet.home");
  return (
    <div className="bg-santa-mint border-santa-green flex items-center gap-3 rounded-2xl border-2 px-4 py-3">
      <UsersRound className="text-santa-green size-5 shrink-0" aria-hidden />
      <p className="text-santa-ink min-w-0 flex-1 text-sm">
        {t("playingNow")}{" "}
        <strong className="text-base font-bold">{current.name}</strong>
      </p>
      <Link
        href={switchPath(to)}
        aria-label={t("switch", { name: current.name })}
        className="bg-santa-green text-santa-white shrink-0 rounded-full px-4 py-2 text-sm font-semibold"
      >
        {t("switchShort")}
      </Link>
    </div>
  );
}
