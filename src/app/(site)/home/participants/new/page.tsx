import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { PageText, PageTitle } from "@/features/account";
import { requireVerifiedAccount } from "@/features/auth";
import {
  AdultForm,
  canCreate,
  CABINET_HOME,
  ChildForm,
  listParticipants,
} from "@/features/profile";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("profile.adult");
  return { title: t("title") };
}

// First the owner's own profile; once it exists the same address adds
// children (no children without a participating adult).
export default async function NewParticipant() {
  const account = await requireVerifiedAccount();
  if (!(await canCreate())) redirect(CABINET_HOME);

  const people = await listParticipants(account.id);
  const hasOwner = people.some((p) => p.kind === "adult");

  if (!hasOwner) {
    const t = await getTranslations("profile.adult");
    return (
      <>
        <PageTitle>{t("title")}</PageTitle>
        <PageText>{t("intro")}</PageText>
        <AdultForm
          mode="create"
          defaults={{
            name: "",
            building: account.building ?? "",
            apartment: account.apartment ?? "",
            wishes: "",
            avoid: "",
            photoUrl: null,
          }}
        />
      </>
    );
  }

  const t = await getTranslations("profile.child");
  return (
    <>
      <PageTitle>{t("title")}</PageTitle>
      <PageText>{t("intro")}</PageText>
      <ChildForm
        mode="create"
        building={account.building ?? ""}
        apartment={account.apartment ?? ""}
        defaults={{ name: "", age: "", wishes: "", avoid: "" }}
      />
    </>
  );
}
