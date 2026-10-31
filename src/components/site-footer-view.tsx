import Link from "next/link";

const DEVELOPER_URL = "https://ludvik4.dev";
const THREADS_URL = "https://www.threads.com/@ludvik.coffee";
const externalLink = "underline-offset-4 hover:underline";

export interface SiteFooterLabels {
  rules: string;
  madeBy: string;
  threads: string;
}

/**
 * Presentational footer: rules link and developer line. Takes ready labels so
 * it also works inside client error boundaries. Pages use `SiteFooter` from
 * the game feature, which supplies the translated labels.
 */
export function SiteFooterView({ labels }: { labels: SiteFooterLabels }) {
  return (
    <footer className="border-santa-line flex flex-col gap-3 border-t px-[26px] py-5">
      <Link href="/rules" className="text-santa-green text-xs leading-relaxed">
        {labels.rules}
      </Link>
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
