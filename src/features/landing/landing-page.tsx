import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { SiteFooter, SiteHeader, registrationOpen } from "@/features/game";
import { cn } from "@/lib/utils";
import type { GameSettings } from "@/features/game";
import santa from "../../../images/generated-2.webp";
import { gameDates } from "./dates";

const STEPS = ["1", "2", "3", "4", "5"] as const;
const ROWS = ["1", "2", "3", "4", "5"] as const;
const FAQ = ["1", "2", "3", "4", "5", "6", "7", "8", "9"] as const;

const H2 =
  "font-heading text-[26px] leading-tight font-bold break-words lg:text-4xl lg:leading-[1.2]";

function LinkButton({
  href,
  children,
  className,
}: {
  href: "/register" | "/signin" | "/home";
  children: ReactNode;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "bg-santa-green text-santa-white flex h-14 w-full items-center justify-between rounded-full px-[22px] text-base font-semibold",
        className,
      )}
    >
      <span>{children}</span>
      <ArrowRight className="size-[21px]" aria-hidden />
    </Link>
  );
}

/** The Santa illustration of the hero (frame nFiq7). */
export function SantaIllustration({ priority }: { priority?: boolean }) {
  return (
    <Image
      src={santa}
      alt=""
      width={280}
      height={240}
      // Next 16 deprecated `priority`; it no longer sets fetchpriority, and
      // this image is the landing's LCP element (Lighthouse budget).
      preload={priority}
      fetchPriority={priority ? "high" : undefined}
      sizes={priority ? "(min-width: 1024px) 480px, 280px" : "280px"}
      className={cn(
        "h-[240px] w-[280px] object-contain",
        priority && "lg:h-[408px] lg:w-[480px]",
      )}
    />
  );
}

/**
 * The explaining part of the landing: «Что такое Тайный Санта», «Как это
 * работает», the key rule, «Даты» and FAQ. Shared by the public landing and
 * the cabinet «Главная», so the copy lives in one place (`landing` messages).
 */
export async function AboutSections({
  settings,
  locale,
}: {
  settings: GameSettings;
  locale: string;
}) {
  const t = await getTranslations("landing");
  const d = gameDates(settings, locale);
  return (
    <>
      {/* Desktop: «what» across the page, then the steps beside the dates and
          the key rule. A phone reads them in DOM order, one column. */}
      <div className="lg:santa-page flex flex-col lg:grid lg:grid-cols-[minmax(0,640px)_minmax(0,400px)] lg:grid-rows-[auto_auto_1fr] lg:justify-between lg:gap-x-20">
        <section className="flex flex-col gap-3.5 px-[26px] py-[30px] lg:col-span-2 lg:grid lg:grid-cols-[360px_minmax(0,660px)] lg:gap-[100px] lg:px-0 lg:py-[72px]">
          <h2 className={cn(H2, "lg:max-w-[270px] lg:leading-[1.15]")}>
            {t("what.title")}
          </h2>
          <p className="text-santa-muted text-sm leading-relaxed lg:text-[17px] lg:leading-[1.7]">
            {t("what.text", d)}
          </p>
        </section>

        <section className="flex flex-col gap-1.5 px-[26px] pb-6 lg:row-span-2 lg:gap-3 lg:px-0 lg:pb-[72px]">
          <h2 className={H2}>{t("how.title")}</h2>
          <ol className="flex flex-col">
            {STEPS.map((n) => (
              <li
                key={n}
                className="border-santa-line flex gap-[13px] py-5 lg:border-b"
              >
                <span
                  className={`text-santa-green flex size-[31px] shrink-0 items-center justify-center rounded-full text-sm font-semibold ${
                    Number(n) % 2 ? "bg-santa-lime" : "bg-santa-yellow"
                  }`}
                >
                  {n}
                </span>
                <div className="flex flex-col gap-2">
                  <h3 className="font-heading text-base font-bold break-words lg:text-lg">
                    {t(`how.steps.${n}.title`, d)}
                  </h3>
                  <p className="text-santa-muted text-[13px] leading-relaxed lg:text-[15px] lg:leading-[1.6]">
                    {t(`how.steps.${n}.text`, d)}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section className="bg-santa-mint mx-[26px] mb-6 flex flex-col gap-2 rounded-2xl p-[18px] lg:col-start-2 lg:row-start-3 lg:mx-0 lg:mt-6 lg:mb-[72px] lg:self-start lg:p-7">
          <h2 className="font-heading text-santa-green text-[17px] font-bold lg:text-lg">
            {t("key.title")}
          </h2>
          <p className="text-santa-ink text-[13px] leading-relaxed lg:text-[15px]">
            {t("key.text", d)}
          </p>
        </section>

        <section className="bg-santa-mint flex flex-col gap-[18px] px-[26px] pt-7 pb-[30px] lg:col-start-2 lg:row-start-2 lg:gap-5 lg:self-start lg:rounded-2xl lg:p-7">
          <h2 className={cn(H2, "lg:text-[32px]")}>{t("dates.title")}</h2>
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
                  <td className="text-santa-ink py-3.5 pr-4 text-[13px] font-semibold lg:text-sm">
                    {t(`dates.rows.${n}.when`, d)}
                  </td>
                  <td className="text-santa-muted py-3.5 text-[13px] lg:text-sm">
                    {t(`dates.rows.${n}.what`, d)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>

      <section className="border-santa-line lg:border-t">
        <div className="lg:santa-page flex flex-col gap-1.5 px-[26px] py-[30px] lg:grid lg:grid-cols-[320px_minmax(0,720px)] lg:justify-between lg:gap-20 lg:py-[64px]">
          <h2 className={H2}>{t("faq.title")}</h2>
          <div className="flex flex-col gap-1.5 lg:gap-0">
            {FAQ.map((n) => (
              <div
                key={n}
                className="border-santa-line flex flex-col gap-2 border-b py-[18px] last:border-b-0 lg:py-[22px] lg:last:border-b"
              >
                <h3 className="font-heading text-base font-bold break-words lg:text-lg">
                  {t(`faq.items.${n}.q`)}
                </h3>
                <p className="text-santa-muted text-[13px] leading-relaxed lg:text-[15px] lg:leading-[1.65]">
                  {t(`faq.items.${n}.a`, d)}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
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

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader
        action={
          signedIn ? (
            <Link
              href="/home"
              className="text-santa-ink text-[13px] lg:text-[15px]"
            >
              {t("hero.toCabinet")}
            </Link>
          ) : (
            <Link
              href="/signin"
              className="text-santa-ink text-[13px] lg:text-[15px]"
            >
              {h("signIn")}
            </Link>
          )
        }
      />
      <main className="flex flex-1 flex-col">
        {/* Phone: text, Santa, ribbon, button. Desktop: text and button on the
            left, Santa on the right, the ribbon under both, edge to edge. */}
        <section className="bg-santa-mint flex flex-col items-center overflow-hidden lg:grid lg:grid-cols-[minmax(26px,1fr)_minmax(0,560px)_80px_minmax(0,480px)_minmax(26px,1fr)] lg:grid-rows-[1fr_auto_auto] lg:items-start">
          <div className="flex flex-col items-center gap-3.5 px-[26px] pt-[18px] pb-2 text-center lg:col-start-2 lg:row-start-1 lg:items-start lg:gap-6 lg:self-end lg:p-0 lg:text-left">
            <h1 className="font-heading text-santa-ink text-[34px] leading-[1.1] font-bold break-words lg:text-[44px] lg:leading-[1.08] xl:text-[54px]">
              {t("hero.title")}
            </h1>
            <p className="text-santa-muted text-[15px] leading-relaxed lg:text-lg lg:leading-[1.6]">
              {t("hero.subtitle")}
            </p>
          </div>
          <div className="flex w-full justify-center pt-4 lg:col-start-4 lg:row-span-2 lg:row-start-1 lg:pt-9 lg:pb-12">
            <SantaIllustration priority />
          </div>
          <p className="bg-santa-yellow text-santa-ink flex h-11 w-full items-center justify-center px-6 text-[13px] font-semibold lg:col-span-full lg:row-start-3 lg:h-12 lg:text-[15px]">
            {open
              ? t("hero.deadline", { close: d.close })
              : t("hero.deadlineClosed")}
          </p>
          <div className="flex w-full flex-col gap-3.5 px-[26px] pt-4 pb-[26px] lg:col-start-2 lg:row-start-2 lg:w-80 lg:gap-4 lg:px-0 lg:pt-6 lg:pb-12">
            <LinkButton href={ctaHref}>
              {signedIn ? t("hero.toCabinet") : t("hero.cta")}
            </LinkButton>
            {signedIn ? null : (
              <p className="text-santa-green text-center text-[13px] lg:text-left lg:text-sm">
                {t.rich("hero.alreadyIn", { link })}
              </p>
            )}
          </div>
        </section>

        <AboutSections settings={settings} locale={locale} />

        <section className="bg-santa-mint">
          <div className="lg:santa-page flex flex-col gap-4 px-[26px] py-8 lg:flex-row lg:items-center lg:justify-between lg:gap-20 lg:py-14">
            <div className="flex flex-col gap-4 lg:max-w-[760px]">
              {/* After the deadline the block no longer invites to join. */}
              <h2 className={H2}>
                {open ? t("final.title") : t("final.titleClosed")}
              </h2>
              <p className="text-santa-muted text-sm leading-relaxed lg:text-base lg:leading-[1.6]">
                {open ? t("final.text", d) : t("final.textClosed")}
              </p>
            </div>
            <LinkButton href={ctaHref} className="lg:w-70 lg:shrink-0">
              {signedIn
                ? t("hero.toCabinet")
                : open
                  ? t("final.cta")
                  : t("final.ctaClosed")}
            </LinkButton>
          </div>
        </section>
      </main>
      {/* Lines the footer up with the 1120px page column on a wide screen. */}
      <SiteFooter className="lg:px-[max(26px,calc((100%-70rem)/2))]" />
    </div>
  );
}
