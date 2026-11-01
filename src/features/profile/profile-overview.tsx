import { getTranslations } from "next-intl/server";
import { LinkButton } from "@/components/form-ui";
import { PageText, PageTitle } from "@/features/account";
import { ParticipantCards } from "./participant-cards";
import type { Participant } from "./queries";
import { NEW_PARTICIPANT } from "./routes";

/**
 * «Анкета» (`/home/profile`): the account's participant cards with their
 * edit buttons and «Добавить ребёнка». Before the owner's profile exists it
 * asks to fill it in. Editing is possible only while registration is open.
 */
export async function ProfileOverview({
  people,
  building,
  apartment,
  registrationOpen,
}: {
  people: Participant[];
  building: string | null;
  apartment: string | null;
  registrationOpen: boolean;
}) {
  const [t, nav] = await Promise.all([
    getTranslations("profile.home"),
    getTranslations("profile.nav"),
  ]);
  const owner = people.find((p) => p.kind === "adult");

  if (!owner) {
    return (
      <div className="flex flex-col gap-5">
        <PageTitle>{t("tellAboutYou")}</PageTitle>
        <PageText>{t("notReady")}</PageText>
        {registrationOpen ? (
          <LinkButton href={NEW_PARTICIPANT}>{t("fillProfile")}</LinkButton>
        ) : null}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <PageTitle>{nav("profile")}</PageTitle>
      <ParticipantCards
        people={people}
        building={building}
        apartment={apartment}
        editable={registrationOpen}
      />
    </div>
  );
}
