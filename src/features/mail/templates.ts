import { createTranslator } from "next-intl";
import { env } from "@/lib/env";
import { DEFAULT_DATES } from "@/lib/game-phase";
import { formatGameDay } from "@/lib/game-time";
import { DEFAULT_LOCALE, isLocale, type Locale } from "@/i18n/locale";
import de from "../../../messages/de.json";
import en from "../../../messages/en.json";
import es from "../../../messages/es.json";
import ru from "../../../messages/ru.json";
import uk from "../../../messages/uk.json";

export const EMAIL_TYPES = [
  "verify",
  "reset",
  "application",
  "draw",
  "giftsOpen",
  "reminder",
  "giftWaiting",
  "reassigned",
  "reveal",
  "exitRequest",
  "backupAsk",
] as const;
export type EmailType = (typeof EMAIL_TYPES)[number];

export type EmailData = {
  /** Participants of the account this email is about. */
  names?: string[];
  /** Link for the button; defaults to the cabinet. Required in practice for verify/reset. */
  url?: string;
  /** giftWaiting: the receiver's gift details. Never the giver. */
  place?: "locker" | "mailbox";
  note?: string | null;
  /** reassigned: true when there is nobody left to give to. */
  noReceiver?: boolean;
  /** exitRequest: who asks to leave, and their optional comment. */
  person?: string;
  comment?: string | null;
  /**
   * backupAsk: the person the volunteer is asked to prepare a gift for.
   * Only what a Santa sees anyway: name, building, flat, wishes, avoid.
   */
  receiver?: {
    name: string;
    building: string | null;
    apartment: string | null;
    wishes: string;
    avoid: string;
  };
  /**
   * Game dates (`YYYY-MM-DD`) from the settings, for the texts that name
   * them; the defaults are used when absent.
   */
  dates?: { giftsEndOn: string; revealOn: string };
};

export type RenderedEmail = { subject: string; text: string; html: string };

const MESSAGES = { ru, uk, en, es, de } as const;
const DEVELOPER_URL = "https://ludvik4.dev";
const THREADS_URL = "https://www.threads.com/@ludvik.coffee";

function appUrl(): string {
  return env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
}

/** The landing's Santa as a small PNG (public/email/santa.png): mail clients
 * do not all show webp, and the hashed /_next asset URL changes per build. */
export function santaImageUrl(): string {
  return `${appUrl()}/email/santa.png`;
}

export function cabinetUrl(): string {
  return `${env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "")}/home`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function renderEmail(
  type: EmailType,
  locale: Locale,
  data: EmailData = {},
): RenderedEmail {
  const safeLocale = isLocale(locale) ? locale : DEFAULT_LOCALE;
  const t = createTranslator({
    locale: safeLocale,
    messages: MESSAGES[safeLocale],
    namespace: "emails",
  });

  const key: string =
    type === "reassigned" && data.noReceiver ? "noReceiver" : type;
  const subject = t(`${key}.subject` as "verify.subject");
  const title = t(`${key}.title` as "verify.title");
  const dates = data.dates ?? DEFAULT_DATES;
  const body = t(`${key}.body` as "verify.body", {
    giftsEnd: formatGameDay(dates.giftsEndOn, safeLocale),
    reveal: formatGameDay(dates.revealOn, safeLocale),
    name: data.person ?? data.receiver?.name ?? "",
  });
  const cta = t(`${key}.cta` as "verify.cta");
  const url = data.url ?? cabinetUrl();

  // Plain lines (text) and the same lines pre-escape (html).
  const lines: string[] = [t("hello"), body];
  if (data.names?.length) {
    const list = new Intl.ListFormat(safeLocale, {
      style: "long",
      type: "conjunction",
    }).format(data.names);
    lines.push(t("forNames", { names: list }));
  }
  if (type === "giftWaiting") {
    if (data.place)
      lines.push(`${t("gift.place")}: ${t(`gift.${data.place}`)}`);
    if (data.note) lines.push(`${t("gift.note")}: ${data.note}`);
  }
  if (type === "verify" || type === "reset") lines.push(t("ignore"));
  if (type === "exitRequest" && data.comment) {
    lines.push(t("exitRequest.comment", { comment: data.comment }));
  }
  if (type === "backupAsk" && data.receiver) {
    const r = data.receiver;
    lines.push(
      t("backupAsk.address", {
        building: r.building ?? "",
        apartment: r.apartment ?? "",
      }),
    );
    if (r.wishes) lines.push(t("backupAsk.wishes", { text: r.wishes }));
    if (r.avoid) lines.push(t("backupAsk.avoid", { text: r.avoid }));
  }

  const textParts = [...lines, `${cta}: ${url}`];
  if (type === "reveal") {
    textParts.push(
      `${t("madeBy")} ludvik4.dev (${DEVELOPER_URL}) · Threads (${THREADS_URL})`,
    );
  }

  const p = (s: string) =>
    `<p style="margin:0 0 14px;font-size:16px;line-height:1.5">${escapeHtml(s)}</p>`;
  const signature =
    type === "reveal"
      ? `<p style="margin:24px 0 0;font-size:12px;color:#526356">${escapeHtml(t("madeBy"))} <a href="${DEVELOPER_URL}" style="color:#526356">ludvik4.dev</a> · <a href="${THREADS_URL}" style="color:#526356">Threads</a></p>`
      : "";
  // The draw mail is the game's big moment: it opens with the landing's Santa.
  const picture =
    type === "draw"
      ? `<img src="${escapeHtml(santaImageUrl())}" width="200" height="200" alt="" style="display:block;width:200px;height:200px;margin:0 0 16px;border:0">`
      : "";
  const html = `<!doctype html><html lang="${safeLocale}"><body style="margin:0;padding:24px;background:#ffffff;color:#183d26;font-family:Arial,Helvetica,sans-serif"><div style="max-width:520px;margin:0 auto">${picture}<h1 style="margin:0 0 16px;font-size:22px">${escapeHtml(title)}</h1>${lines.map(p).join("")}<p style="margin:20px 0"><a href="${escapeHtml(url)}" style="display:inline-block;padding:12px 20px;background:#235a32;color:#ffffff;text-decoration:none;border-radius:8px">${escapeHtml(cta)}</a></p>${signature}</div></body></html>`;

  return { subject, text: textParts.join("\n\n"), html };
}
