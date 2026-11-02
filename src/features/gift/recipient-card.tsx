import { Lock, UserRound } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import { LinkButton, TextLink } from "@/components/form-ui";
import { PhotoZoom } from "@/components/photo-zoom";
import { PageText, PageTitle } from "@/features/account";
import {
  LocalizedText,
  getLocalized,
  participantKey,
} from "@/features/translation";
import { isLocale } from "@/i18n/locale";
import { giftPath } from "@/lib/cabinet-routes";
import type { RecipientInfo } from "./queries";

/** Disabled pill (component zuc1P). */
export function DisabledButton({ children }: { children: React.ReactNode }) {
  return (
    <div
      aria-disabled="true"
      className="bg-santa-mint text-santa-muted flex h-14 w-full items-center justify-between rounded-full px-6 text-base font-semibold"
    >
      <span>{children}</span>
      <Lock className="size-[18px]" aria-hidden />
    </div>
  );
}

async function UserText({
  title,
  text,
  translated,
  sourceLocale,
  empty,
}: {
  title: string;
  text: string;
  translated: string | null;
  sourceLocale: RecipientInfo["sourceLocale"];
  empty: string;
}) {
  return (
    <section className="border-santa-line flex flex-col gap-1 border-t pt-3">
      <h2 className="text-santa-green text-xs font-semibold">{title}</h2>
      <p className="text-santa-ink text-sm leading-relaxed">
        {text.trim() ? (
          <LocalizedText
            original={text}
            translated={translated}
            sourceLocale={sourceLocale}
          />
        ) : (
          <span className="text-santa-muted">{empty}</span>
        )}
      </p>
    </section>
  );
}

/**
 * The recipient card (frame Ygz4u, with the photo variant): name, address,
 * photo, wishes and what to avoid in the viewer's language, amount and dates.
 * Rendered only for the recipient's current giver (see `getRecipient`).
 * After a drop-out the "recipient changed" marker (frame WgvFY) is shown.
 */
export async function RecipientCard({
  personId,
  recipient,
  reassigned,
  giftLeft,
  canMark,
  window,
}: {
  personId: string;
  recipient: RecipientInfo;
  reassigned: boolean;
  giftLeft: boolean;
  canMark: boolean;
  /** Already formatted dates, e.g. "25 декабря". */
  window: { start: string; end: string };
}) {
  const [t, locale] = await Promise.all([
    getTranslations("gift.recipient"),
    getLocale(),
  ]);
  const viewer = isLocale(locale) ? locale : "en";
  const translations =
    recipient.sourceLocale === viewer
      ? new Map<string, string | null>()
      : await getLocalized(
          [
            {
              key: participantKey(recipient.id, "wishes"),
              original: recipient.wishes,
            },
            {
              key: participantKey(recipient.id, "avoid"),
              original: recipient.avoid,
            },
          ],
          viewer,
        );

  return (
    <div className="flex flex-col gap-5">
      <span className="bg-santa-mint text-santa-green self-start rounded-full px-3 py-1 text-xs font-semibold">
        {reassigned ? t("changedChip") : t("chip")}
      </span>

      {reassigned ? (
        <>
          <PageTitle>{t("changedTitle")}</PageTitle>
          <div className="bg-santa-yellow text-santa-ink flex flex-col gap-1 rounded-2xl p-4">
            <p className="text-base font-bold">
              {t("changedBox", { name: recipient.name })}
            </p>
            <p className="text-sm leading-relaxed">{t("changedText")}</p>
          </div>
        </>
      ) : null}

      {/* Without a photo: round placeholder above the name (frame Ygz4u). */}
      <div
        className={
          recipient.photoUrl
            ? "flex items-center gap-4"
            : "flex flex-col items-start gap-3"
        }
      >
        {recipient.photoUrl ? (
          <PhotoZoom
            src={recipient.photoUrl}
            alt={t("photoAlt", { name: recipient.name })}
            openLabel={t("photoOpen", { name: recipient.name })}
            closeLabel={t("photoClose")}
            className="size-20 rounded-full object-cover"
          />
        ) : (
          <span
            data-testid="photo-placeholder"
            className="bg-santa-mint text-santa-green flex size-[68px] shrink-0 items-center justify-center rounded-full"
          >
            <UserRound className="size-[30px]" aria-hidden />
          </span>
        )}
        <div className="flex flex-col gap-1">
          {reassigned ? (
            <p className="text-santa-ink text-lg font-bold">{recipient.name}</p>
          ) : (
            <PageTitle>{recipient.name}</PageTitle>
          )}
          <p
            className={
              recipient.photoUrl
                ? "text-santa-muted text-sm leading-relaxed"
                : "text-santa-ink text-[17px] leading-relaxed"
            }
          >
            {t("address", {
              building: recipient.building ?? "",
              apartment: recipient.apartment ?? "",
            })}
            {recipient.kind === "child"
              ? ` · ${t("childAge", { age: recipient.age ?? 0 })}`
              : ""}
            {recipient.kind === "child" && recipient.gender
              ? ` · ${t(`genderShort.${recipient.gender}`)}`
              : ""}
          </p>
        </div>
      </div>

      <UserText
        title={t("wishes")}
        text={recipient.wishes}
        translated={
          translations.get(participantKey(recipient.id, "wishes")) ?? null
        }
        sourceLocale={recipient.sourceLocale}
        empty={t("empty")}
      />
      <UserText
        title={t("avoid")}
        text={recipient.avoid}
        translated={
          translations.get(participantKey(recipient.id, "avoid")) ?? null
        }
        sourceLocale={recipient.sourceLocale}
        empty={t("empty")}
      />

      {/* Once the gift is left the budget hint has done its job: the same
          mint box says the gift is in place instead. */}
      <div
        data-testid={giftLeft ? "gift-left-box" : "budget-box"}
        className="bg-santa-mint flex flex-col gap-1 rounded-2xl p-4"
      >
        <p className="text-santa-green text-base font-bold">
          {giftLeft ? t("leftTitle") : t("budgetTitle")}
        </p>
        <p className="text-santa-muted text-sm leading-relaxed">
          {giftLeft
            ? t("leftText")
            : t("budgetText", { start: window.start, end: window.end })}
        </p>
      </div>

      {giftLeft ? (
        <TextLink href={giftPath(personId)}>{t("viewGift")}</TextLink>
      ) : canMark ? (
        <LinkButton href={giftPath(personId)}>{t("leaveGift")}</LinkButton>
      ) : (
        <>
          <DisabledButton>{t("leaveGift")}</DisabledButton>
          <PageText>{t("notYet", { start: window.start })}</PageText>
        </>
      )}
      <PageText>{t("private")}</PageText>
    </div>
  );
}
