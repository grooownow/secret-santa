import Link from "next/link";

const DEVELOPER_URL = "https://ludvik4.dev/";
const TELEGRAM_URL = "https://t.me/ludvik4";
const THREADS_URL = "https://www.threads.com/@ludvik.coffee";

export interface SiteFooterLabels {
  rules: string;
  madeBy: string;
  contact: string;
  social: string;
  threads: string;
  order: string;
}

function ExternalLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-santa-green underline-offset-4 hover:underline"
    >
      {children}
    </a>
  );
}

function Row({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <p className="flex flex-wrap items-center gap-x-[5px]">
      <span className="text-santa-muted">{label}</span>
      {children}
    </p>
  );
}

/**
 * Presentational footer, one mint block (design Bc6WA, "Низ страницы"):
 * optional organizer line, the author block (made by, contact, social, order
 * a site), then the rules link. Every line is the same 12px size; the
 * language switcher lives in the header, so the footer has no language line.
 * Takes ready labels so it also works inside client error boundaries. Pages
 * use `SiteFooter` from the game feature, which supplies the translations.
 */
export function SiteFooterView({
  labels,
  organizer,
}: {
  labels: SiteFooterLabels;
  /** Organizer line (landing only). */
  organizer?: React.ReactNode;
}) {
  return (
    <footer className="bg-santa-mint border-santa-line flex flex-col gap-[14px] border-t px-[26px] py-7 text-xs leading-normal">
      {organizer ? <p className="text-santa-muted">{organizer}</p> : null}
      <p className="text-santa-ink font-semibold">{labels.madeBy} — Ludvik4</p>
      <Row label={labels.contact}>
        <ExternalLink href={TELEGRAM_URL}>t.me/ludvik4</ExternalLink>
      </Row>
      <Row label={labels.social}>
        <ExternalLink href={THREADS_URL}>{labels.threads}</ExternalLink>
      </Row>
      <Row label={`${labels.order} —`}>
        <ExternalLink href={DEVELOPER_URL}>ludvik4.dev</ExternalLink>
      </Row>
      <Link href="/rules" className="text-santa-green self-start">
        {labels.rules}
      </Link>
    </footer>
  );
}
