import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { requireVerifiedAccount } from "@/features/auth";
import { canGuess, formatGameDay, getSettings } from "@/features/game";
import { BeforeDraw, NotInDraw, participantIdSchema } from "@/features/gift";
import { CurrentSwitch } from "@/features/profile";
import { GuessForm, listGuessOptions } from "@/features/reveal";
import { revealPath } from "@/lib/cabinet-routes";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("reveal.guess");
  return { title: t("title") };
}

// «Кто же твой Санта?»: the list holds only name and building. From 1 January
// the guess is closed and the reveal takes over.
export default async function GuessPage({
  params,
}: {
  params: Promise<{ participantId: string }>;
}) {
  const account = await requireVerifiedAccount();
  const id = participantIdSchema.safeParse((await params).participantId);
  if (!id.success) notFound();
  const result = await listGuessOptions(account.id, id.data);
  if (!result) notFound();

  const settings = await getSettings();
  if (result.state === "notDrawn") {
    return <BeforeDraw drawOn={settings.drawOn} />;
  }
  if (result.state === "notInDraw") return <NotInDraw />;
  if (!canGuess(new Date(), settings)) redirect(revealPath(id.data));

  const locale = await getLocale();
  return (
    <>
      <CurrentSwitch userId={account.id} personId={id.data} to="home" />
      <GuessForm
        participantId={id.data}
        options={result.options}
        savedId={result.guessedId}
        until={formatGameDay(settings.giftsEndOn, locale)}
        reveal={formatGameDay(settings.revealOn, locale)}
      />
    </>
  );
}
