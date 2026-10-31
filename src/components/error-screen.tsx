import { CloudOff } from "lucide-react";
import Link from "next/link";
import {
  SiteFooterView,
  type SiteFooterLabels,
} from "@/components/site-footer-view";

export interface ErrorScreenLabels {
  appName: string;
  title: string;
  text: string;
  uncertainTitle: string;
  uncertainText: string;
  retry: string;
  home: string;
  reference: string;
  footer: SiteFooterLabels;
}

/**
 * "Server unavailable" screen (frame X7FpT). Pure markup so both `error.tsx`
 * and `global-error.tsx` can use it. `showHome` is off in global-error, where
 * the router may be gone.
 */
export function ErrorScreen({
  labels,
  digest,
  onRetry,
  showHome = true,
}: {
  labels: ErrorScreenLabels;
  digest?: string;
  onRetry: () => void;
  showHome?: boolean;
}) {
  return (
    <div className="bg-santa-white text-santa-ink flex min-h-screen flex-col">
      <header className="bg-santa-mint flex items-center justify-between px-6 py-5">
        <span className="font-heading text-base font-bold">
          {labels.appName}
        </span>
        {showHome ? (
          <Link href="/" className="text-[13px]">
            {labels.home}
          </Link>
        ) : null}
      </header>
      <main className="flex flex-1 flex-col gap-5 px-[26px] py-7">
        <div className="bg-santa-mint flex size-[68px] items-center justify-center rounded-full">
          <CloudOff aria-hidden className="text-santa-green size-[30px]" />
        </div>
        <h1 className="text-[26px] leading-tight font-bold">{labels.title}</h1>
        <p className="text-santa-muted text-sm leading-relaxed">
          {labels.text}
        </p>
        <div className="bg-santa-yellow flex flex-col gap-[7px] rounded-xl p-[18px]">
          <h2 className="text-[17px] leading-tight font-bold">
            {labels.uncertainTitle}
          </h2>
          <p className="text-[13px] leading-relaxed">{labels.uncertainText}</p>
        </div>
        {digest ? (
          <p className="text-santa-muted font-mono text-xs">
            {labels.reference}: {digest}
          </p>
        ) : null}
        <button
          type="button"
          onClick={onRetry}
          className="bg-santa-green text-santa-white h-14 w-full rounded-full px-[22px] text-base font-semibold"
        >
          {labels.retry}
        </button>
        {showHome ? (
          <Link href="/" className="text-santa-green text-[13px] font-semibold">
            {labels.home}
          </Link>
        ) : null}
      </main>
      <SiteFooterView labels={labels.footer} />
    </div>
  );
}
