import { Check } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { PageText, PageTitle } from "@/features/account";
import { cn } from "@/lib/utils";

export interface SwitcherPerson {
  id: string;
  name: string;
  kind: "adult" | "child";
  age: number | null;
}

/**
 * "Кто сегодня Санта?" (frame eIsHY): an account with several participants
 * picks whose cabinet to open. Each participant has their own recipient and
 * gift. The active one is highlighted and marked «Сейчас играет»; the others
 * get a button that posts the choice to `action` (with `to`, the tab to
 * return to).
 */
export async function ParticipantSwitcher({
  people,
  currentId,
  building,
  apartment,
  action,
  to,
}: {
  people: SwitcherPerson[];
  currentId: string | null;
  building: string | null;
  apartment: string | null;
  action: (formData: FormData) => Promise<void>;
  to: "home" | "gift" | "profile";
}) {
  const t = await getTranslations("cabinet.switcher");
  return (
    <div className="flex flex-col gap-5">
      <PageTitle>{t("title")}</PageTitle>
      <PageText>{t("text")}</PageText>
      <ul className="flex flex-col gap-3">
        {people.map((person) => {
          const current = person.id === currentId;
          return (
            <li
              key={person.id}
              aria-current={current ? "true" : undefined}
              className={cn(
                "flex flex-col gap-1 rounded-2xl p-4",
                current
                  ? "border-santa-green bg-santa-mint border-2"
                  : "border-santa-line border",
              )}
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
              {current ? (
                <p className="bg-santa-green text-santa-white mt-2 flex items-center gap-1.5 self-start rounded-full px-3 py-1.5 text-sm font-semibold">
                  <Check className="size-4" aria-hidden />
                  {t("current")}
                </p>
              ) : (
                <form action={action} className="mt-2">
                  <input type="hidden" name="participantId" value={person.id} />
                  <input type="hidden" name="to" value={to} />
                  <button
                    type="submit"
                    className="border-santa-green text-santa-green bg-santa-white h-11 w-full rounded-full border px-4 text-sm font-semibold"
                  >
                    {t("open", { name: person.name })}
                  </button>
                </form>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
