import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { SiteFooter, SiteHeader, registrationOpen } from "@/features/game";
import type { GameSettings } from "@/features/game";
import { ORGANIZER_TELEGRAM } from "@/lib/organizer";
import santa from "../../../images/generated-2.webp";
import { gameDates } from "./dates";

const STEPS = ["1", "2", "3", "4", "5"] as const;
const ROWS = ["1", "2", "3", "4", "5"] as const;
const FAQ = ["1", "2", "3", "4", "5", "6", "7", "8", "9"] as const;

const H2 = "font-heading text-[26px] leading-tight font-bold break-words";

function LinkButton({
  href,
  children,
}: {
  href: "/register" | "/signin" | "/home";
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      className="bg-santa-green text-santa-white flex h-14 w-full items-center justify-between rounded-full px-[22px] text-base font-semibold"
    >
      <span>{children}</span>
      <ArrowRight className="size-[21px]" aria-hidden />
    </Link>
  );
}

export interface LandingPageProps {
  settings: GameSettings;
  now: Date;
  locale: string;
  signedIn: boolean;
}

/** Public landing page (frame nFiq7). Texts come from the `landing` messages. */
export async function LandingPage({
  settings,
  now,
  locale,
  signedIn,
}: LandingPageProps) {
  const [t, h] = await Promise.all([
    getTranslations("landing"),
    getTranslations("header"),
  ]);
  const open = registrationOpen(now, settings);
  // After the deadline "become a Santa" only makes sense for people who
  // already have an account, so it leads to sign-in.
  // A signed-in visitor gets the cabinet instead of a second "become a Santa".
  const ctaHref = signedIn ? "/home" : open ? "/register" : "/signin";
  const d = gameDates(settings, locale);
  const link = (chunks: ReactNode) => (
    <Link href="/signin" className="font-semibold underline">
      {chunks}
    </Link>
  );
  const telegram = (chunks: ReactNode) => (
    <a
      href={ORGANIZER_TELEGRAM}
      target="_blank"
      rel="noopener noreferrer"
      className="text-santa-green font-semibold underline"
    >
      {chunks}
    </a>
  );

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader
        action={
          signedIn ? (
            <Link href="/home" className="text-santa-ink text-[13px]">
              {t("hero.toCabinet")}
            </Link>
          ) : (
            <Link href="/signin" className="text-santa-ink text-[13px]">
              {h("signIn")}
            </Link>
          )
        }
      />
      <main className="flex flex-1 flex-col">
        <section className="bg-santa-mint flex flex-col items-center overflow-hidden">
          <div className="flex flex-col items-center gap-3.5 px-[26px] pt-[18px] pb-2 text-center">
            <h1 className="font-heading text-santa-ink text-[34px] leading-[1.1] font-bold break-words">
              {t("hero.title")}
            </h1>
            <p className="text-santa-muted text-[15px] leading-relaxed">
              {t("hero.subtitle")}
            </p>
          </div>
          <div className="relative flex w-full flex-col items-center pt-4">
            <Image
              src={santa}
              alt=""
              width={280}
              height={240}
              priority
              sizes="280px"
              className="h-[240px] w-[280px] object-contain"
            />
            <p className="bg-santa-yellow text-santa-ink flex h-11 w-full items-center justify-center px-6 text-[13px] font-semibold">
              {open
                ? t("hero.deadline", { close: d.close })
                : t("hero.deadlineClosed")}
            </p>
          </div>
        </section>

        <section className="bg-santa-mint flex flex-col gap-3.5 px-[26px] pt-4 pb-[26px]">
          <LinkButton href={ctaHref}>
            {signedIn ? t("hero.toCabinet") : t("hero.cta")}
          </LinkButton>
          {signedIn ? null : (
            <p className="text-santa-green text-center text-[13px]">
              {t.rich("hero.alreadyIn", { link })}
            </p>
          )}
        </section>

        <section className="flex flex-col gap-3.5 px-[26px] py-[30px]">
          <h2 className={H2}>{t("what.title")}</h2>
          <p className="text-santa-muted text-sm leading-relaxed">
            {t("what.text", d)}
          </p>
        </section>

        <section className="flex flex-col gap-1.5 px-[26px] pb-6">
          <h2 className={H2}>{t("how.title")}</h2>
          <ol className="flex flex-col">
            {STEPS.map((n) => (
              <li key={n} className="flex gap-[13px] py-5">
                <span
                  className={`text-santa-green flex size-[31px] shrink-0 items-center justify-center rounded-full text-sm font-semibold ${
                    Number(n) % 2 ? "bg-santa-lime" : "bg-santa-yellow"
                  }`}
                >
                  {n}
                </span>
                <div className="flex flex-col gap-2">
                  <h3 className="font-heading text-base font-bold break-words">
                    {t(`how.steps.${n}.title`, d)}
                  </h3>
                  <p className="text-santa-muted text-[13px] leading-relaxed">
                    {t(`how.steps.${n}.text`, d)}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section className="bg-santa-mint mx-[26px] mb-6 flex flex-col gap-2 rounded-2xl p-[18px]">
          <h2 className="font-heading text-santa-green text-[17px] font-bold">
            {t("key.title")}
          </h2>
          <p className="text-santa-ink text-[13px] leading-relaxed">
            {t("key.text", d)}
          </p>
        </section>

        <section className="bg-santa-mint flex flex-col gap-[18px] px-[26px] pt-7 pb-[30px]">
          <h2 className={H2}>{t("dates.title")}</h2>
          <table className="w-full text-left">
            <thead>
              <tr className="text-[11px] font-semibold">
                <th className="text-santa-ink w-[124px] py-3.5 pr-4 font-semibold">
                  {t("dates.when")}
                </th>
                <th className="text-santa-muted py-3.5 font-semibold">
                  {t("dates.what")}
                </th>
              </tr>
            </thead>
            <tbody>
              {ROWS.map((n) => (
                <tr key={n} className="border-santa-line border-t align-top">
                  <td className="text-santa-ink py-3.5 pr-4 text-[13px] font-semibold">
                    {t(`dates.rows.${n}.when`, d)}
                  </td>
                  <td className="text-santa-muted py-3.5 text-[13px]">
                    {t(`dates.rows.${n}.what`, d)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="flex flex-col gap-1.5 px-[26px] py-[30px]">
          <h2 className={H2}>{t("faq.title")}</h2>
          {FAQ.map((n) => (
            <div
              key={n}
              className="border-santa-line flex flex-col gap-2 border-b py-[18px] last:border-b-0"
            >
              <h3 className="font-heading text-base font-bold break-words">
                {t(`faq.items.${n}.q`)}
              </h3>
              <p className="text-santa-muted text-[13px] leading-relaxed">
                {t(`faq.items.${n}.a`, d)}
              </p>
            </div>
          ))}
        </section>

        <section className="bg-santa-mint flex flex-col gap-4 px-[26px] py-8">
          <h2 className={H2}>{t("final.title")}</h2>
          <p className="text-santa-muted text-sm leading-relaxed">
            {open ? t("final.text", d) : t("final.textClosed")}
          </p>
          <LinkButton href={ctaHref}>
            {signedIn ? t("hero.toCabinet") : t("final.cta")}
          </LinkButton>
        </section>

        <p className="bg-santa-mint text-santa-muted px-[26px] pb-6 text-xs leading-relaxed">
          {t.rich("organizer", { link: telegram })}
        </p>
      </main>
      <SiteFooter />
    </div>
  );
}
