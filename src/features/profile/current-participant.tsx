import { cookies } from "next/headers";
import { getTranslations } from "next-intl/server";
import { TextLink } from "@/components/form-ui";
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

/** «Сменить участника (сейчас: …)»: only for accounts with several participants. */
export async function CurrentSwitch({
  userId,
  personId,
  to,
}: {
  userId: string;
  personId: string;
  to: "home" | "gift";
}) {
  const people = await listParticipants(userId);
  const current = people.find((person) => person.id === personId);
  if (people.length < 2 || !current) return null;
  const t = await getTranslations("cabinet.home");
  return (
    <TextLink href={switchPath(to)}>
      {t("switch", { name: current.name })}
    </TextLink>
  );
}
