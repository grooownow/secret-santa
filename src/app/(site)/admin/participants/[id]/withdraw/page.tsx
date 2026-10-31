import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { LinkButton } from "@/components/form-ui";
import { getDb } from "@/db/client";
import { participants, users } from "@/db/schema";
import { PageText, PageTitle } from "@/features/account";
import { ADMIN_PARTICIPANTS, WithdrawConfirm } from "@/features/admin";
import { requireOrganizer } from "@/features/auth";
import { addDays, canExit, getSettings } from "@/features/game";
import { idSchema } from "@/features/profile";
import { formatGameDay } from "@/lib/game-time";

// Confirmation of a withdrawal (frame ksxL7). Only while waiting.
export default async function WithdrawPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireOrganizer();
  const parsed = idSchema.safeParse((await params).id);
  if (!parsed.success) notFound();
  const [person] = await getDb()
    .select({
      id: participants.id,
      name: participants.name,
      kind: participants.kind,
      building: users.building,
      apartment: users.apartment,
    })
    .from(participants)
    .innerJoin(users, eq(users.id, participants.userId))
    .where(eq(participants.id, parsed.data))
    .limit(1);
  const settings = await getSettings();
  if (!person || !canExit(new Date(), settings)) notFound();

  const [t, locale] = await Promise.all([
    getTranslations("admin.withdraw"),
    getLocale(),
  ]);
  const lastExit = formatGameDay(addDays(settings.giftsStartOn, -1), locale);
  return (
    <>
      <PageTitle>{t("title")}</PageTitle>
      <div className="flex flex-col gap-1">
        <p className="text-santa-ink text-base font-bold">{person.name}</p>
        <p className="text-santa-muted text-[13px]">
          {t("flat", {
            building: person.building ?? "–",
            apartment: person.apartment ?? "–",
          })}
        </p>
      </div>
      <div className="bg-santa-yellow flex flex-col gap-2 rounded-2xl p-[18px]">
        <p className="text-santa-ink text-base font-bold">
          {t("boxTitle", { lastExit })}
        </p>
        <p className="text-santa-ink text-sm leading-relaxed">{t("boxText")}</p>
      </div>
      <PageText>{t("backupNote")}</PageText>
      {person.kind === "adult" ? <PageText>{t("accountNote")}</PageText> : null}
      <WithdrawConfirm id={person.id} lastExit={lastExit} />
      <LinkButton href={ADMIN_PARTICIPANTS}>{t("cancel")}</LinkButton>
    </>
  );
}
