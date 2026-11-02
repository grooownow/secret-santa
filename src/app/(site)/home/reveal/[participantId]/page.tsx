import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { requireVerifiedAccount } from "@/features/auth";
import { NotInDraw, participantIdSchema } from "@/features/gift";
import { CurrentSwitch } from "@/features/profile";
import { getReveal, RevealCard } from "@/features/reveal";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("reveal.card");
  return { title: t("chip") };
}

// The Santa is shown only from 1 January: earlier, and for another account's
// participant, `getReveal` returns null and the page is a plain 404.
export default async function RevealPage({
  params,
}: {
  params: Promise<{ participantId: string }>;
}) {
  const account = await requireVerifiedAccount();
  const id = participantIdSchema.safeParse((await params).participantId);
  if (!id.success) notFound();
  const reveal = await getReveal(account.id, id.data);
  if (!reveal) notFound();
  if (reveal.state === "notInDraw") return <NotInDraw />;
  return (
    <RevealCard
      personId={id.data}
      reveal={reveal}
      switcher={
        <CurrentSwitch userId={account.id} personId={id.data} to="home" />
      }
    />
  );
}
