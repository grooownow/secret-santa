import { Pencil, Plus, UserRound } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { cn } from "@/lib/utils";
import type { Participant } from "./queries";
import { NEW_PARTICIPANT, participantPath } from "./routes";

/**
 * The account's participants as cards: «Ты в игре» for the adult alone,
 * «Твоя семья в игре» once there is a child. The adult card is white with
 * «это ты», a child card is mint with «ребёнок · N лет». Each card shows the
 * saved photo (children have none, spec §3) or a placeholder, and while
 * registration is open a pencil button to edit it and «Добавить ребёнка».
 */
export async function ParticipantCards({
  people,
  building,
  apartment,
  editable,
}: {
  people: Participant[];
  building: string | null;
  apartment: string | null;
  /** Registration is open: cards can be edited and children added. */
  editable: boolean;
}) {
  const t = await getTranslations("profile.home");
  const hasChild = people.some((p) => p.kind === "child");
  const title = hasChild ? t("family") : t("solo");

  return (
    <section className="flex flex-col gap-3" aria-label={title}>
      <h2 className="text-santa-ink text-base font-bold">{title}</h2>
      <ul className="flex flex-col gap-3">
        {people.map((person) => {
          const adult = person.kind === "adult";
          return (
            <li
              key={person.id}
              data-kind={person.kind}
              className={cn(
                "flex items-center gap-3 rounded-2xl border p-4",
                adult
                  ? "border-santa-line bg-santa-white"
                  : "bg-santa-mint border-transparent",
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
                    : `${t("child")} · ${t("childAge", { age: person.age ?? 0 })}`}
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
                  aria-label={t("edit")}
                  className={cn(
                    "text-santa-green hover:bg-santa-lime flex size-11 shrink-0 items-center justify-center rounded-full transition-colors",
                    adult ? "bg-santa-mint" : "bg-santa-white",
                  )}
                >
                  <Pencil className="size-5" aria-hidden />
                </Link>
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
