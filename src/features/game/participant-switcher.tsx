import type { Route } from "next";
import { getTranslations } from "next-intl/server";
import { TextLink } from "@/components/form-ui";
import { PageText, PageTitle } from "@/features/account";

export interface SwitcherPerson {
  id: string;
  name: string;
  kind: "adult" | "child";
  age: number | null;
}

/**
 * "Кто сегодня Санта?" (frame eIsHY): an account with several participants
 * picks whose cabinet to open. Each participant has their own recipient and
 * gift. `hrefFor` decides where the choice leads.
 */
export async function ParticipantSwitcher({
  people,
  building,
  apartment,
  hrefFor,
}: {
  people: SwitcherPerson[];
  building: string | null;
  apartment: string | null;
  hrefFor: (id: string) => Route;
}) {
  const t = await getTranslations("cabinet.switcher");
  return (
    <div className="flex flex-col gap-5">
      <PageTitle>{t("title")}</PageTitle>
      <PageText>{t("text")}</PageText>
      <ul className="flex flex-col gap-3">
        {people.map((person) => (
          <li
            key={person.id}
            className="border-santa-line flex flex-col gap-1 rounded-2xl border p-4"
          >
            <p className="text-santa-ink text-base font-bold">
              {person.name} ·{" "}
              {person.kind === "adult"
                ? t("owner")
                : t("childAge", { age: person.age ?? 0 })}
            </p>
            <p className="text-santa-muted text-sm">
              {t("address", {
                building: building ?? "",
                apartment: apartment ?? "",
              })}
            </p>
            <TextLink href={hrefFor(person.id)}>
              {t("open", { name: person.name })}
            </TextLink>
          </li>
        ))}
      </ul>
    </div>
  );
}
