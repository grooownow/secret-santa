"use client";

import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { Spinner } from "@/components/spinner";
import { setBackupVolunteer } from "./volunteer-action";

/**
 * «Могу быть запасным Сантой»: a switch the account flips for itself. The
 * organizer sees volunteers on «Помощь» and may ask one to prepare a gift for
 * someone left without a Santa.
 */
export function VolunteerToggle({ initial }: { initial: boolean }) {
  const t = useTranslations("settings.volunteer");
  const [on, setOn] = useState(initial);
  const [failed, setFailed] = useState(false);
  const [pending, startTransition] = useTransition();
  return (
    <div className="flex flex-col gap-2">
      <label className="flex cursor-pointer items-start gap-3">
        <input
          type="checkbox"
          checked={on}
          disabled={pending}
          onChange={(event) => {
            const next = event.target.checked;
            setOn(next);
            startTransition(async () => {
              const result = await setBackupVolunteer(next).catch(() => null);
              if (!result?.ok) {
                setOn(!next);
                setFailed(true);
              } else setFailed(false);
            });
          }}
          className="accent-santa-green mt-0.5 size-5 shrink-0"
        />
        <span className="text-santa-ink flex items-center gap-2 text-sm leading-relaxed">
          {t("label")}
          {pending ? <Spinner className="size-3.5" /> : null}
        </span>
      </label>
      <p className="text-santa-muted text-xs leading-relaxed">{t("hint")}</p>
      {failed ? (
        <p role="alert" className="text-santa-danger text-sm">
          {t("failed")}
        </p>
      ) : null}
    </div>
  );
}
