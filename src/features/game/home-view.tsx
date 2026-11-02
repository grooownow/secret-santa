import { getTranslations } from "next-intl/server";
import { LinkButton, TextLink } from "@/components/form-ui";
import { PageText, PageTitle } from "@/features/account";
import { CABINET_WALL, recipientPath, revealPath } from "@/lib/cabinet-routes";

export type HomePhase = "waiting" | "gifts" | "reveal";

export interface HomeViewProps {
  phase: HomePhase;
  person: { id: string; name: string };
  /** `none`: the recipient dropped out and nobody is left to give to. */
  recipient:
    | { state: "none" }
    | {
        state: "ready";
        name: string;
        building: string | null;
        apartment: string | null;
        reassigned: boolean;
        giftLeft: boolean;
      };
  /**
   * «Подарок для тебя» (ForYouBox from the gift feature), rendered by the
   * page: what this participant receives. Shown first in the gifts phase.
   */
  forYou?: React.ReactNode;
  daysToGifts: number;
  /** Already formatted dates, e.g. "25 декабря". */
  dates: { giftsStart: string; giftsEnd: string };
}

function Box({
  tone,
  title,
  text,
}: {
  tone: "yellow" | "mint";
  title: string;
  text?: string;
}) {
  return (
    <div
      className={`${tone === "yellow" ? "bg-santa-yellow text-santa-ink" : "bg-santa-mint text-santa-green"} flex flex-col gap-1 rounded-2xl p-4`}
    >
      <p className="text-base font-bold">{title}</p>
      {text ? (
        <p className="text-santa-ink text-sm leading-relaxed">{text}</p>
      ) : null}
    </div>
  );
}

function Block({
  title,
  text,
  children,
}: {
  title: string;
  text?: string;
  children?: React.ReactNode;
}) {
  return (
    <section className="border-santa-line flex flex-col gap-2 border-t pt-4">
      <h2 className="text-santa-ink text-base font-bold">{title}</h2>
      {text ? <PageText>{text}</PageText> : null}
      {children}
    </section>
  );
}

/**
 * "Дом" after the draw (frames mUkK6, dmFIt, gNnhD; spec 5, "Что на странице
 * «Дом» по этапам"): waiting, gifts and reveal each show their own blocks.
 * The collect phase is `HomeCollect` in the profile feature. Data comes in as
 * plain props, so the view has no queries of its own.
 */
export async function HomeView(props: HomeViewProps) {
  const { phase, person, recipient, dates } = props;
  const t = await getTranslations("cabinet.home");
  const id = person.id;

  const chip = {
    waiting: t("chipWaiting", { date: dates.giftsStart }),
    gifts: t("chipGifts"),
    reveal: t("chipReveal"),
  }[phase];
  const title = {
    waiting: t("titleWaiting"),
    gifts: t("titleGifts"),
    reveal: t("titleReveal"),
  }[phase];

  return (
    <div className="flex flex-col gap-5">
      <span className="bg-santa-mint text-santa-green self-start rounded-full px-3 py-1 text-xs font-semibold">
        {chip}
      </span>
      <PageTitle>{title}</PageTitle>

      {phase === "waiting" ? (
        <Box
          tone="yellow"
          title={t("daysTitle", { days: props.daysToGifts })}
          text={t("daysText", { date: dates.giftsStart })}
        />
      ) : null}

      {/* What I receive comes first: it is the more exciting news. */}
      {phase === "gifts" ? props.forYou : null}

      {phase === "reveal" ? (
        <LinkButton href={revealPath(id)}>{t("whoIsSanta")}</LinkButton>
      ) : recipient.state === "ready" ? (
        // «Кому я дарю»: who, and one link to their page («Я дарю»), where
        // leaving the gift lives. No big button here.
        <section
          data-giving={recipient.giftLeft ? "left" : "todo"}
          className="border-santa-line flex flex-col gap-1 border-t pt-4"
        >
          <h2 className="text-santa-ink text-base font-bold">
            {t("recipient", { name: recipient.name })}
          </h2>
          {recipient.giftLeft ? (
            <PageText>{t("givenText")}</PageText>
          ) : (
            <PageText>
              {t("address", {
                building: recipient.building ?? "",
                apartment: recipient.apartment ?? "",
              })}
            </PageText>
          )}
          {recipient.reassigned ? <PageText>{t("changed")}</PageText> : null}
          <TextLink href={recipientPath(id)}>
            {recipient.giftLeft
              ? t("givenLink")
              : t("openRecipient", { name: recipient.name })}
          </TextLink>
        </section>
      ) : (
        <Box tone="mint" title={t("noneTitle")} text={t("noneText")} />
      )}

      {phase !== "waiting" ? (
        <Block title={t("wallTitle")} text={t("wallText")}>
          <TextLink href={CABINET_WALL}>{t("wallLink")}</TextLink>
        </Block>
      ) : null}
    </div>
  );
}
