import Link from "next/link";

const DEVELOPER_URL = "https://ludvik4.dev";
const THREADS_URL = "https://www.threads.com/@ludvik.coffee";
const externalLink = "underline-offset-4 hover:underline";
/** The language line of the design; a fixed label, not translated. */
export const LANGUAGE_LINE = "RU · UA · EN · ES · DE";

export interface SiteFooterLabels {
  rules: string;
  madeBy: string;
  threads: string;
}

/**
 * Presentational footer, one mint block as in the landing design (nFiq7,
 * "Низ страницы"): optional organizer line, rules link with the language
 * line, developer line. Takes ready labels so it also works inside client
 * error boundaries. Pages use `SiteFooter` from the game feature, which
 * supplies the translated labels.
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
    <footer className="bg-santa-mint border-santa-line flex flex-col gap-[15px] border-t px-[26px] py-6">
      {organizer ? (
        <p className="text-santa-muted text-xs leading-normal">{organizer}</p>
      ) : null}
      <div className="flex items-center justify-between gap-3">
        <Link href="/rules" className="text-santa-green text-xs">
          {labels.rules}
        </Link>
        <span className="text-santa-muted text-[10px]">{LANGUAGE_LINE}</span>
      </div>
      <p className="text-santa-muted flex items-center gap-[3px] pt-[5px] text-[10px]">
        <span>{labels.madeBy}</span>
        <a
          href={DEVELOPER_URL}
          target="_blank"
          rel="noopener noreferrer"
          className={externalLink}
        >
          ludvik4.dev
        </a>
        <span aria-hidden>·</span>
        <a
          href={THREADS_URL}
          target="_blank"
          rel="noopener noreferrer"
          className={externalLink}
        >
          {labels.threads}
        </a>
      </p>
    </footer>
  );
}
