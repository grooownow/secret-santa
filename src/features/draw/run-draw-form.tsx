"use client";

import { ArrowUpRight, CircleAlert, X } from "lucide-react";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState, useTransition } from "react";
import { LinkButton } from "@/components/form-ui";
import { runDraw, type DrawResult } from "./run-draw-action";

type Failure = Extract<DrawResult, { ok: false }>;

const primaryClass =
  "bg-santa-green text-santa-white flex h-14 w-full items-center justify-between rounded-full px-6 text-base font-semibold disabled:opacity-60";
const secondaryClass =
  "border-santa-green text-santa-green bg-santa-white flex h-14 w-full items-center justify-between rounded-full border px-6 text-base font-semibold disabled:opacity-60";

/** `K:24` -> `K, 24`. */
function showFlat(flat: string): string {
  const [building = "", ...rest] = flat.split(":");
  return `${building}, ${rest.join(":")}`;
}

/**
 * "Запустить жеребьёвку": the confirmation (frame dPnGE) opens as a modal and
 * a refusal is shown in the organizer's interface language with its reason
 * (frame BEoW3).
 */
export function RunDrawForm({
  ready,
  excluded,
  checkHref,
}: {
  ready: number;
  excluded: number;
  checkHref: Route;
}) {
  const t = useTranslations("admin.draw");
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [failure, setFailure] = useState<Failure | null>(null);
  const [pending, startTransition] = useTransition();
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  function confirm() {
    startTransition(async () => {
      let result: DrawResult;
      try {
        result = await runDraw();
      } catch {
        result = { ok: false, reason: "failed" };
      }
      setOpen(false);
      setFailure(result.ok ? null : result);
      // Another tab already ran the draw: show the post-draw view.
      if (!result.ok && result.reason === "already_drawn") router.refresh();
    });
  }

  const chainFailure =
    failure?.reason === "too_few" || failure?.reason === "household_too_large";

  return (
    <div className="flex flex-col gap-5">
      {failure ? (
        <>
          <div className="bg-santa-mint text-santa-green flex size-[68px] items-center justify-center rounded-full">
            <CircleAlert className="size-[30px]" aria-hidden />
          </div>
          <h1 className="text-santa-ink text-[26px] leading-tight font-bold">
            {t("errorHeading")}
          </h1>
          <div
            role="alert"
            className="bg-santa-danger-bg flex flex-col gap-[7px] rounded-xl p-[18px]"
          >
            <p className="text-santa-ink text-[17px] font-bold">
              {t("errorTitle")}
            </p>
            <p className="text-santa-muted text-[13px] leading-relaxed">
              {failure.reason === "household_too_large" && failure.flat
                ? t("reason.household_too_large", {
                    flat: showFlat(failure.flat),
                  })
                : t(`reason.${failure.reason}`)}
            </p>
          </div>
          {chainFailure ? (
            <p className="text-santa-muted text-sm leading-relaxed">
              {t("notSaved")}
            </p>
          ) : null}
          <LinkButton href={checkHref}>{t("check")}</LinkButton>
          <button
            type="button"
            disabled={pending}
            onClick={() => setOpen(true)}
            className={secondaryClass}
          >
            <span>{t("retry")}</span>
            <ArrowUpRight className="size-[18px]" aria-hidden />
          </button>
        </>
      ) : (
        <>
          <button
            type="button"
            disabled={pending}
            onClick={() => setOpen(true)}
            className={primaryClass}
          >
            <span>{t("start")}</span>
            <ArrowUpRight className="size-[18px]" aria-hidden />
          </button>
          <p className="text-santa-muted text-xs leading-relaxed">
            {t("hint")}
          </p>
        </>
      )}
      {/* The backdrop click is a mouse shortcut only: keyboard users close
          with Esc (onCancel) or the ✕ button, so no key handler is missing. */}
      {/* oxlint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-noninteractive-element-interactions */}
      <dialog
        ref={dialogRef}
        aria-labelledby="draw-confirm-title"
        onCancel={(event) => {
          if (pending) event.preventDefault();
          else setOpen(false);
        }}
        // A click on the backdrop lands on the <dialog> itself (the content
        // wrapper below fills it edge to edge), so close like Esc does.
        onClick={(event) => {
          if (event.target === event.currentTarget && !pending) setOpen(false);
        }}
        className="bg-santa-white backdrop:bg-santa-ink/40 m-auto w-[calc(100%-2rem)] max-w-md rounded-3xl p-0"
      >
        <div className="relative flex flex-col gap-5 p-6">
          <button
            type="button"
            disabled={pending}
            onClick={() => setOpen(false)}
            aria-label={t("close")}
            className="text-santa-ink hover:bg-santa-mint absolute top-3 right-3 flex size-10 items-center justify-center rounded-full disabled:opacity-60"
          >
            <X className="size-5" aria-hidden />
          </button>
          <h2
            id="draw-confirm-title"
            className="text-santa-ink pr-8 text-[26px] leading-tight font-bold"
          >
            {t("confirmTitle")}
          </h2>
          <div className="bg-santa-yellow text-santa-ink flex flex-col gap-[7px] rounded-xl p-[18px]">
            <p className="text-[17px] font-bold">
              {t("confirmReady", { count: ready })}
            </p>
            {excluded > 0 ? (
              <p className="text-[13px] leading-relaxed">
                {t("confirmExcluded", { count: excluded })}
              </p>
            ) : null}
          </div>
          <p className="text-santa-muted text-sm leading-relaxed">
            {t("confirmText")}
          </p>
          <p className="text-santa-muted text-[13px] leading-relaxed">
            {t("confirmMail")}
          </p>
          <button
            type="button"
            disabled={pending}
            onClick={confirm}
            className={primaryClass}
          >
            <span>{pending ? t("running") : t("confirm")}</span>
            <ArrowUpRight className="size-[18px]" aria-hidden />
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() => setOpen(false)}
            className={secondaryClass}
          >
            <span>{t("cancel")}</span>
            <ArrowUpRight className="size-[18px]" aria-hidden />
          </button>
        </div>
      </dialog>
    </div>
  );
}
