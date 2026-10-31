import type { ReactNode } from "react";
import { getTranslations } from "next-intl/server";
import type { GameSettings } from "@/features/game";
import { ORGANIZER_TELEGRAM } from "@/lib/organizer";
import { gameDates } from "./dates";

const PROCESSORS = ["vercel", "neon", "blob", "gmail", "google"] as const;

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-2 pb-[18px]">
      <h2 className="font-heading text-[17px] font-bold break-words">
        {title}
      </h2>
      {children}
    </section>
  );
}

const BODY = "text-santa-muted text-sm leading-relaxed";

/** Rules and data notice (frame eNR4M): game conditions and data handling. */
export async function RulesContent({
  settings,
  locale,
  version,
}: {
  settings: GameSettings;
  locale: string;
  version: string;
}) {
  const [t, consent] = await Promise.all([
    getTranslations("rules"),
    getTranslations("account.consent"),
  ]);
  const d = { ...gameDates(settings, locale), version };
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
  const plain = ["gift", "kids", "purpose", "stored", "health"] as const;

  return (
    <>
      <span className="bg-santa-mint text-santa-green w-fit rounded-full px-3 py-[7px] text-[11px] font-semibold">
        {t("badge")}
      </span>
      <h1 className="font-heading text-[26px] leading-tight font-bold break-words">
        {t("title")}
      </h1>
      <p className={BODY}>{t("intro")}</p>
      {plain.slice(0, 2).map((k) => (
        <Section key={k} title={t(`${k}.title`)}>
          <p className={BODY}>{t(`${k}.text`, d)}</p>
        </Section>
      ))}
      <Section title={t("controller.title")}>
        <p className={BODY}>{t.rich("controller.text", { link: telegram })}</p>
      </Section>
      {plain.slice(2).map((k) => (
        <Section key={k} title={t(`${k}.title`)}>
          <p className={BODY}>{t(`${k}.text`, d)}</p>
        </Section>
      ))}
      <Section title={t("processors.title")}>
        <p className={BODY}>{t("processors.intro")}</p>
        <ul className="text-santa-muted flex list-disc flex-col gap-1.5 pl-5 text-sm leading-relaxed">
          {PROCESSORS.map((k) => (
            <li key={k}>{t(`processors.${k}`)}</li>
          ))}
          <li>{consent("processors")}</li>
          <li>{t("processors.translate")}</li>
        </ul>
      </Section>
      <Section title={t("retention.title")}>
        <p className={BODY}>{t("retention.text", d)}</p>
      </Section>
      <Section title={t("rights.title")}>
        <p className={BODY}>{t("rights.text", d)}</p>
      </Section>
      <p className="text-santa-muted text-xs">{t("version", d)}</p>
    </>
  );
}
