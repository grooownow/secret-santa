import { Check, Pencil, Plus, UserRound } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { cn } from "@/lib/utils";
import type { Participant } from "./queries";
import { NEW_PARTICIPANT, participantPath } from "./routes";
import { PendingSpinner } from "@/components/spinner";

/**
 * The account's participants as cards: «Ты в игре» for the adult alone,
 * «Твоя семья в игре» once there is a child. The adult card is white with
 * «это ты», a child card is mint with «ребёнок · N лет». Each card shows the
 * saved photo (children have none, spec §3) or a placeholder, and while
 * registration is open a pencil button to edit it and «Добавить ребёнка».
 * After the draw, with several participants (`active`), the card of the one
 * playing now gets a green frame and «Сейчас играет», the others a button to
 * play as them.
 */
export async function ParticipantCards({
  people,
  building,
  apartment,
  editable,
  active,
}: {
  people: Participant[];
  building: string | null;
  apartment: string | null;
  /** Registration is open: cards can be edited and children added. */
  editable: boolean;
  /** After the draw: who plays now and how to switch (posts participantId). */
  active?: {
    currentId: string;
    action: (formData: FormData) => Promise<void>;
  };
}) {
  const t = await getTranslations("profile.home");
  const hasChild = people.some((p) => p.kind === "child");
  const title = hasChild ? t("family") : t("solo");

  return (
    <section className="flex flex-col gap-3" aria-label={title}>
      <h2 className="text-santa-ink text-base font-bold">{title}</h2>
      {active ? (
        <p className="text-santa-muted text-sm leading-relaxed">
          {t("activeHint", {
            name:
              people.find((p) => p.id === active.currentId)?.name ??
              people[0]?.name ??
              "",
          })}
        </p>
      ) : null}
      <ul className="flex flex-col gap-3">
        {people.map((person) => {
          const adult = person.kind === "adult";
          const current = active?.currentId === person.id;
          return (
            <li
              key={person.id}
              data-kind={person.kind}
              aria-current={current ? "true" : undefined}
              className={cn(
                "flex flex-wrap items-center gap-3 rounded-2xl p-4",
                current ? "border-santa-green border-2" : "border",
                adult ? "bg-santa-white" : "bg-santa-mint",
                !current &&
                  (adult ? "border-santa-line" : "border-transparent"),
              )}
            >
              {person.photoUrl ? (
                <Image
                  src={person.photoUrl}
                  alt={t("photoAlt", { name: person.name })}
                  width={48}
                  height={48}
                  unoptimized
                  className="size-12 shrink-0 rounded-full object-cover"
                />
              ) : (
                <span
                  data-testid="photo-placeholder"
                  className={cn(
                    "text-santa-green flex size-12 shrink-0 items-center justify-center rounded-full",
                    adult ? "bg-santa-mint" : "bg-santa-white",
                  )}
                >
                  <UserRound className="size-6" aria-hidden />
                </span>
              )}
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <p className="text-santa-ink text-base font-bold break-words">
                  {person.name}
                </p>
                <span
                  className={cn(
                    "self-start rounded-full px-2.5 py-0.5 text-xs font-semibold",
                    adult
                      ? "bg-santa-mint text-santa-green"
                      : "bg-santa-white text-santa-green",
                  )}
                >
                  {adult
                    ? t("owner")
                    : [
                        t("child"),
                        t("childAge", { age: person.age ?? 0 }),
                        person.gender
                          ? t(`genderShort.${person.gender}`)
                          : null,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                </span>
                <p className="text-santa-muted text-sm">
                  {t("address", {
                    building: building ?? "",
                    apartment: apartment ?? "",
                  })}
                </p>
                <p className="text-santa-muted text-sm">{t("filled")}</p>
              </div>
              {editable ? (
                <Link
                  href={participantPath(person.id)}
                  aria-label={t("edit", { name: person.name })}
                  className={cn(
                    "text-santa-green hover:bg-santa-lime flex size-11 shrink-0 items-center justify-center rounded-full transition-colors",
                    adult ? "bg-santa-mint" : "bg-santa-white",
                  )}
                >
                  <Pencil className="size-5" aria-hidden />
                </Link>
              ) : null}
              {active ? (
                current ? (
                  <p className="bg-santa-green text-santa-white flex basis-full items-center justify-center gap-1.5 rounded-full px-3 py-2 text-sm font-semibold">
                    <Check className="size-4" aria-hidden />
                    {t("playingNow")}
                  </p>
                ) : (
                  <form action={active.action} className="basis-full">
                    <input
                      type="hidden"
                      name="participantId"
                      value={person.id}
                    />
                    <input type="hidden" name="to" value="profile" />
                    <button
                      type="submit"
                      className="border-santa-green text-santa-green bg-santa-white h-10 w-full rounded-full border px-4 text-sm font-semibold"
                    >
                      <span className="flex items-center justify-center gap-2">
                        {t("playAs", { name: person.name })}
                        <PendingSpinner className="size-4" />
                      </span>
                    </button>
                  </form>
                )
              ) : null}
            </li>
          );
        })}
      </ul>
      {editable ? (
        <Link
          href={NEW_PARTICIPANT}
          className="border-santa-line text-santa-green hover:border-santa-green flex h-10 items-center gap-1.5 self-start rounded-full border px-4 text-sm font-semibold transition-colors"
        >
          <Plus className="size-4" aria-hidden />
          {t("addChild")}
        </Link>
      ) : null}
    </section>
  );
}
