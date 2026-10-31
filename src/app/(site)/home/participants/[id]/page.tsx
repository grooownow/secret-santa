import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { PageText, PageTitle } from "@/features/account";
import { requireVerifiedAccount } from "@/features/auth";
import {
  AdultForm,
  canEdit,
  CABINET_HOME,
  ChildForm,
  DeleteParticipantForm,
  getOwnParticipant,
  idSchema,
} from "@/features/profile";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("profile.adult");
  return { title: t("titleEdit") };
}

// Someone else's id (or a malformed one) is a plain 404: nothing about the
// participant is revealed.
export default async function EditParticipant({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const account = await requireVerifiedAccount();
  const parsed = idSchema.safeParse((await params).id);
  if (!parsed.success) notFound();
  const person = await getOwnParticipant(account.id, parsed.data);
  if (!person) notFound();
  if (!(await canEdit())) redirect(CABINET_HOME);

  if (person.kind === "adult") {
    const t = await getTranslations("profile.adult");
    return (
      <>
        <PageTitle>{t("titleEdit")}</PageTitle>
        <PageText>{t("intro")}</PageText>
        <AdultForm
          mode="edit"
          defaults={{
            name: person.name,
            building: account.building ?? "",
            apartment: account.apartment ?? "",
            wishes: person.wishes,
            avoid: person.avoid,
            photoUrl: person.photoUrl,
          }}
        />
        <DeleteParticipantForm id={person.id} withChildren />
      </>
    );
  }

  const t = await getTranslations("profile.child");
  return (
    <>
      <PageTitle>{t("titleEdit")}</PageTitle>
      <PageText>{t("intro")}</PageText>
      <ChildForm
        mode="edit"
        building={account.building ?? ""}
        apartment={account.apartment ?? ""}
        defaults={{
          id: person.id,
          name: person.name,
          age: String(person.age ?? ""),
          wishes: person.wishes,
          avoid: person.avoid,
        }}
      />
      <DeleteParticipantForm id={person.id} />
    </>
  );
}
