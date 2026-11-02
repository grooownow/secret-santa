"use client";

import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import type { BackupEntry, Volunteer } from "./backup";
import { assignVolunteer, type AssignResult } from "./backup-actions";
import { organizeBackup } from "./organize-backup-action";
import { ListboxSelect } from "@/components/listbox-select";
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

/** «Попросить добровольца»: pick a volunteer, they get an email. */
function AskVolunteer({
  entry,
  options,
}: {
  entry: BackupEntry;
  /** Already filtered on the server (not their account or flat). */
  options: Volunteer[];
}) {
  const t = useTranslations("admin.backup");
  const [picked, setPicked] = useState("");
  const [result, setResult] = useState<AssignResult | null>(null);
  const [pending, startTransition] = useTransition();
  if (options.length === 0) {
    return <p className="text-santa-muted text-[13px]">{t("noVolunteers")}</p>;
  }
  return (
    <div className="flex flex-col gap-2">
      <ListboxSelect
        name={`volunteer-${entry.participantId}`}
        placeholder={t("pickVolunteer")}
        aria-labelledby={`ask-${entry.participantId}`}
        onValueChange={setPicked}
        options={options.map((v) => ({
          value: v.userId,
          label: t("volunteerOption", {
            name: v.name,
            building: v.building ?? "–",
            apartment: v.apartment ?? "–",
          }),
        }))}
      />
      <span id={`ask-${entry.participantId}`} className="sr-only">
        {t("pickVolunteer")}
      </span>
      <button
        type="button"
        disabled={!picked || pending}
        aria-busy={pending || undefined}
        onClick={() =>
          startTransition(async () => {
            setResult(
              await assignVolunteer({
                participantId: entry.participantId,
                volunteerId: picked,
              }).catch(() => ({ ok: false, error: "mail" as const })),
            );
          })
        }
        className="border-santa-green text-santa-green flex h-10 items-center justify-center gap-2 self-start rounded-full border px-4 text-sm font-semibold disabled:opacity-60"
      >
        {t("ask")}
        {pending ? <Spinner className="size-3.5" /> : null}
      </button>
      {result && !result.ok ? (
        <p role="alert" className="text-santa-danger text-sm">
          {t(`askErrors.${result.error ?? "invalid"}`)}
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
  volunteers,
  options,
}: {
  needed: BackupEntry[];
  organized: BackupEntry[];
  volunteers: Volunteer[];
  /** Eligible volunteers per receiver (participantId → list). */
  options: Record<string, Volunteer[]>;
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
              {e.volunteer ? (
                <p className="text-santa-green text-[13px] font-semibold">
                  {t("asked", { name: e.volunteer.name })}
                </p>
              ) : (
                <AskVolunteer
                  entry={e}
                  options={options[e.participantId] ?? []}
                />
              )}
              <OrganizeButton id={e.participantId} />
            </li>
          ))}
        </ul>
      )}
      <section className="flex flex-col gap-1">
        <h2 className="text-santa-ink text-base font-bold">
          {t("volunteersTitle", { count: volunteers.length })}
        </h2>
        {volunteers.length === 0 ? (
          <p className="text-santa-muted text-sm">{t("volunteersEmpty")}</p>
        ) : (
          volunteers.map((v) => (
            <p key={v.userId} className="text-santa-muted text-sm">
              {v.name} ·{" "}
              {t("flat", {
                building: v.building ?? "–",
                apartment: v.apartment ?? "–",
              })}
            </p>
          ))
        )}
      </section>
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
