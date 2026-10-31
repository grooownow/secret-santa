"use client";

import { useTranslations } from "next-intl";
import { useEffect, useRef, useState, useTransition } from "react";
import { FormAlert } from "@/components/form-ui";
import { runDraw, type DrawResult } from "./run-draw-action";

type Failure = Extract<DrawResult, { ok: false }>;

/** `K:24` -> `K, 24`. */
function showFlat(flat: string): string {
  const [building = "", ...rest] = flat.split(":");
  return `${building}, ${rest.join(":")}`;
}

/**
 * "Запустить жеребьёвку": opens a confirmation (frame dPnGE); a refusal is
 * shown in the organizer's interface language with its reason (frame BEoW3).
 */
export function RunDrawForm({ disabled }: { disabled?: boolean }) {
  const t = useTranslations("admin.draw");
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
    });
  }

  return (
    <div className="flex flex-col gap-3">
      {failure ? (
        <FormAlert title={t("errorTitle")}>
          {failure.reason === "household_too_large" && failure.flat
            ? t("reason.household_too_large", {
                flat: showFlat(failure.flat),
              })
            : t(`reason.${failure.reason}`)}{" "}
          {failure.reason === "already_drawn" ? null : t("notSaved")}
        </FormAlert>
      ) : null}
      <button
        type="button"
        disabled={disabled || pending}
        onClick={() => setOpen(true)}
        className="bg-santa-green text-santa-white flex h-14 w-full items-center justify-center rounded-full px-6 text-base font-semibold disabled:opacity-60"
      >
        {t("start")}
      </button>
      <dialog
        ref={dialogRef}
        aria-labelledby="draw-confirm-title"
        onCancel={(event) => {
          if (pending) event.preventDefault();
          else setOpen(false);
        }}
        className="bg-santa-white backdrop:bg-santa-ink/40 m-auto w-[calc(100%-2rem)] max-w-md rounded-3xl p-6"
      >
        <div className="flex flex-col gap-4">
          <h2
            id="draw-confirm-title"
            className="text-santa-ink text-xl font-bold"
          >
            {t("confirmTitle")}
          </h2>
          <p className="text-santa-muted text-sm leading-relaxed">
            {t("confirmText")}
          </p>
          <button
            type="button"
            disabled={pending}
            onClick={confirm}
            className="bg-santa-green text-santa-white flex h-14 w-full items-center justify-center rounded-full px-6 text-base font-semibold disabled:opacity-60"
          >
            {pending ? t("running") : t("confirm")}
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() => setOpen(false)}
            className="text-santa-green self-center text-[13px] font-semibold underline-offset-4 hover:underline"
          >
            {t("cancel")}
          </button>
        </div>
      </dialog>
    </div>
  );
}
