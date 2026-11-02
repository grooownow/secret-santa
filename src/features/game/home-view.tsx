import { getTranslations } from "next-intl/server";
import { cn } from "@/lib/utils";
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
  /** «Сейчас играет» bar (phone: on top; desktop: right of the title). */
  switcher?: React.ReactNode;
  daysToGifts: number;
  /** Already formatted dates, e.g. "25 декабря". */
  dates: { giftsStart: string; giftsEnd: string };
}

// Desktop columns of the mockup: the main card and the 384px side column.
const MAIN = "lg:col-start-1";
const SIDE = "lg:col-start-2 lg:row-span-2 lg:row-start-2 lg:self-start";

function Box({
  tone,
  title,
  text,
  className,
}: {
  tone: "yellow" | "mint";
  title: string;
  text?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        tone === "yellow"
          ? "bg-santa-yellow text-santa-ink"
          : "bg-santa-mint text-santa-green",
        "flex flex-col gap-1 rounded-2xl p-4 lg:gap-3 lg:p-6",
        className,
      )}
    >
      <p className="font-heading text-base font-bold lg:text-[22px]">{title}</p>
      {text ? (
        <p className="text-santa-ink text-sm leading-relaxed lg:text-[15px]">
          {text}
        </p>
      ) : null}
    </div>
  );
}

function Block({
  title,
  text,
  className,
  children,
}: {
  title: string;
  text?: string;
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <section
      className={cn(
        "border-santa-line flex flex-col gap-2 border-t pt-4 lg:gap-3 lg:rounded-2xl lg:border lg:p-6",
        className,
      )}
    >
      <h2 className="text-santa-ink text-base font-bold lg:text-[22px]">
        {title}
      </h2>
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
    <div
      data-wide
      className="flex flex-col gap-5 lg:grid lg:grid-cols-[minmax(0,704px)_minmax(0,384px)] lg:justify-between lg:gap-8"
    >
      <div className="flex flex-col gap-5 lg:col-span-2 lg:flex-row lg:items-center lg:justify-between lg:gap-20">
        <div className="empty:hidden lg:order-last lg:shrink-0">
          {props.switcher}
        </div>
        <div className="flex flex-col gap-5 lg:gap-4">
          <span className="bg-santa-mint text-santa-green self-start rounded-full px-3 py-1 text-xs font-semibold">
            {chip}
          </span>
          <PageTitle>{title}</PageTitle>
        </div>
      </div>

      {phase === "waiting" ? (
        <Box
          tone="yellow"
          title={t("daysTitle", { days: props.daysToGifts })}
          text={t("daysText", { date: dates.giftsStart })}
          className={SIDE}
        />
      ) : null}

      {/* What I receive comes first: it is the more exciting news. */}
      {phase === "gifts" ? <div className={MAIN}>{props.forYou}</div> : null}

      {phase === "reveal" ? (
        <LinkButton href={revealPath(id)} className={MAIN}>
          {t("whoIsSanta")}
        </LinkButton>
      ) : recipient.state === "ready" ? (
        // «Кому я дарю»: who, and one link to their page («Я дарю»), where
        // leaving the gift lives. No big button here.
        <section
          data-giving={recipient.giftLeft ? "left" : "todo"}
          className={cn(
            "border-santa-line flex flex-col gap-1 border-t pt-4 lg:gap-3 lg:rounded-2xl lg:border lg:p-8",
            MAIN,
          )}
        >
          <h2 className="text-santa-ink text-base font-bold lg:text-[22px]">
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
        <Box
          tone="mint"
          title={t("noneTitle")}
          text={t("noneText")}
          className={MAIN}
        />
      )}

      {phase !== "waiting" ? (
        <Block title={t("wallTitle")} text={t("wallText")} className={SIDE}>
          <TextLink href={CABINET_WALL}>{t("wallLink")}</TextLink>
        </Block>
      ) : null}
    </div>
  );
}
