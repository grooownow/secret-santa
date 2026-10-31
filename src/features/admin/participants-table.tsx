"use client";

import { isRedirectError } from "next/dist/client/components/redirect-error";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import Link from "next/link";
import { TextInput } from "@/components/form-ui";
import type { ParticipantRow } from "./queries";
import { withdrawPath } from "./routes";
import { UnnotifiedNotice } from "./unnotified-notice";
import type { Unnotified } from "./withdraw";
import { withdrawAction } from "./withdraw-action";

export type TablePhase = "collect" | "waiting" | "later";

function RemoveButton({ id }: { id: string }) {
  const t = useTranslations("admin.participants");
  const [error, setError] = useState(false);
  const [unnotified, setUnnotified] = useState<Unnotified[] | null>(null);
  const [pending, startTransition] = useTransition();
  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        disabled={pending}
        className="text-santa-danger self-start text-[13px] font-semibold underline-offset-4 hover:underline disabled:opacity-60"
        onClick={() => {
          if (!window.confirm(t("removeConfirm"))) return;
          startTransition(async () => {
            try {
              const result = await withdrawAction(id);
              if (!result) return;
              if (!result.ok) setError(true);
              else setUnnotified(result.unnotified);
            } catch (caught) {
              if (isRedirectError(caught)) throw caught;
              setError(true);
            }
          });
        }}
      >
        {t("remove")}
      </button>
      {unnotified ? <UnnotifiedNotice items={unnotified} /> : null}
      {error ? (
        <p role="alert" className="text-santa-danger text-sm">
          {t("removeFailed")}
        </p>
      ) : null}
    </div>
  );
}

/**
 * The organizer's table (frame a8tVB): name, building, flat and email status,
 * with a search box. "Удалить заявку" in collect, "Выбытие" from the draw to
 * 24 December, nothing later.
 */
export function ParticipantsTable({
  rows,
  phase,
}: {
  rows: ParticipantRow[];
  phase: TablePhase;
}) {
  const t = useTranslations("admin.participants");
  const [query, setQuery] = useState("");
  const needle = query.trim().toLowerCase();
  const shown = needle
    ? rows.filter((r) =>
        `${r.name} ${r.building ?? ""} ${r.apartment ?? ""}`
          .toLowerCase()
          .includes(needle),
      )
    : rows;

  return (
    <div className="flex flex-col gap-4">
      <label className="flex flex-col gap-2">
        <span className="text-santa-green text-xs font-semibold">
          {t("search")}
        </span>
        <TextInput
          type="search"
          value={query}
          placeholder={t("searchPlaceholder")}
          onChange={(event) => setQuery(event.target.value)}
        />
      </label>
      {shown.length === 0 ? (
        <p className="text-santa-muted text-sm">{t("empty")}</p>
      ) : (
        <ul className="flex flex-col">
          {shown.map((r) => (
            <li
              key={r.id}
              className="border-santa-line flex flex-col gap-1 border-b py-3"
            >
              <p className="text-santa-ink text-base font-bold">{r.name}</p>
              <p className="text-santa-muted text-[13px]">
                {t("flat", {
                  building: r.building ?? "–",
                  apartment: r.apartment ?? "–",
                })}
              </p>
              <p
                className={
                  r.verified
                    ? "text-santa-muted text-[13px]"
                    : "text-santa-danger text-[13px]"
                }
              >
                {r.verified ? t("verified") : t("unverified")}
              </p>
              {phase === "collect" ? <RemoveButton id={r.id} /> : null}
              {phase === "waiting" ? (
                <Link
                  href={withdrawPath(r.id)}
                  className="text-santa-danger self-start text-[13px] font-semibold underline-offset-4 hover:underline"
                >
                  {t("withdraw")}
                </Link>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
