"use client";

import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import type { BackupEntry } from "./backup";
import { organizeBackup } from "./organize-backup-action";
import { Spinner } from "@/components/spinner";

function OrganizeButton({ id }: { id: string }) {
  const t = useTranslations("admin.backup");
  const [failed, setFailed] = useState(false);
  const [pending, startTransition] = useTransition();
  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const result = await organizeBackup(id).catch(() => null);
            setFailed(!result?.ok);
          })
        }
        aria-busy={pending || undefined}
        className="text-santa-green flex items-center gap-1.5 self-start text-[13px] font-semibold underline-offset-4 hover:underline disabled:opacity-60"
      >
        {t("organize")}
        {pending ? <Spinner className="size-3.5" /> : null}
      </button>
      {failed ? (
        <p role="alert" className="text-santa-danger text-sm">
          {t("failed")}
        </p>
      ) : null}
    </div>
  );
}

/**
 * "Нужен запасной Санта" (frame w6MjaY): who needs a gift, why, and the mark
 * "подарок организован". Organized ones are listed apart. Never names a giver.
 */
export function BackupList({
  needed,
  organized,
}: {
  needed: BackupEntry[];
  organized: BackupEntry[];
}) {
  const t = useTranslations("admin.backup");
  const flat = (e: BackupEntry) =>
    t("flat", { building: e.building ?? "–", apartment: e.apartment ?? "–" });

  return (
    <div className="flex flex-col gap-5">
      {needed.length === 0 ? (
        <p className="text-santa-muted text-sm">{t("empty")}</p>
      ) : (
        <ul className="flex flex-col">
          {needed.map((e) => (
            <li
              key={e.participantId}
              className="border-santa-line flex flex-col gap-1 border-b py-3"
            >
              <p className="text-santa-ink text-base font-bold">{e.name}</p>
              <p className="text-santa-muted text-[13px]">{flat(e)}</p>
              <p className="text-santa-muted text-[13px]">
                {t(`reason.${e.reason}`)}
              </p>
              <OrganizeButton id={e.participantId} />
            </li>
          ))}
        </ul>
      )}
      {organized.length > 0 ? (
        <div className="bg-santa-mint flex flex-col gap-1 rounded-2xl p-4">
          <p className="text-santa-green text-base font-bold">
            {t("organizedTitle", { count: organized.length })}
          </p>
          {organized.map((e) => (
            <p key={e.participantId} className="text-santa-muted text-sm">
              {e.name} · {flat(e)}
            </p>
          ))}
        </div>
      ) : null}
    </div>
  );
}
