"use client";

import { ArrowUpRight, CircleCheck, Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { FormAlert, TextInput } from "@/components/form-ui";
import { saveGuess, type GuessState } from "./guess-action";
import type { GuessOption } from "./queries";

/**
 * "Кто же твой Санта?" (frame zY7JF) and the saved state (frame YMQby). The
 * list is already on the page, the search only filters it in the browser. The
 * page never learns whether the guess is right: that opens on 1 January.
 */
export function GuessForm({
  participantId,
  options,
  savedId,
  until,
}: {
  participantId: string;
  options: GuessOption[];
  savedId: string | null;
  /** Already formatted last day to change the guess, e.g. "31 декабря". */
  until: string;
}) {
  const t = useTranslations("reveal.guess");
  const [current, setCurrent] = useState(savedId);
  const [editing, setEditing] = useState(savedId === null);
  const [picked, setPicked] = useState(savedId ?? "");
  const [query, setQuery] = useState("");
  const [state, setState] = useState<GuessState>({});
  const [pending, start] = useTransition();

  const currentOption = options.find((option) => option.id === current);
  const needle = query.trim().toLowerCase();
  const visible = options.filter((option) =>
    `${option.name} ${option.building ?? ""}`.toLowerCase().includes(needle),
  );

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!picked) return;
    start(async () => {
      const result = await saveGuess({ participantId, guessedId: picked });
      setState(result);
      if (result.saved) {
        setCurrent(picked);
        setEditing(false);
      }
    });
  }

  if (!editing && currentOption) {
    return (
      <div className="flex flex-col gap-5">
        <div className="bg-santa-mint text-santa-green flex size-14 items-center justify-center rounded-full">
          <Sparkles className="size-6" aria-hidden />
        </div>
        <h1 className="text-santa-ink text-[26px] leading-tight font-bold">
          {t("savedTitle", { name: currentOption.name })}
        </h1>
        <div className="bg-santa-mint flex flex-col gap-1 rounded-2xl p-4">
          <p className="text-santa-green flex items-center gap-2 text-base font-bold">
            <CircleCheck className="size-4" aria-hidden />
            {t("savedBox")}
          </p>
          <p className="text-santa-muted text-sm leading-relaxed">
            {t("option", {
              name: currentOption.name,
              building: currentOption.building ?? "",
            })}
          </p>
          <p className="text-santa-muted text-sm leading-relaxed">
            {t("savedHint")}
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setPicked(currentOption.id);
            setState({});
            setEditing(true);
          }}
          className="border-santa-green text-santa-green flex h-14 w-full items-center justify-between rounded-full border px-6 text-base font-semibold"
        >
          <span>{t("change")}</span>
          <ArrowUpRight className="size-[18px]" aria-hidden />
        </button>
        <p className="text-santa-muted text-xs leading-relaxed">
          {t("changeUntil", { date: until })}
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-5">
      <span className="bg-santa-mint text-santa-green self-start rounded-full px-3 py-1 text-xs font-semibold">
        {t("chip", { date: until })}
      </span>
      <h1 className="text-santa-ink text-[26px] leading-tight font-bold">
        {t("title")}
      </h1>
      <p className="text-santa-muted text-sm leading-relaxed">
        {t("intro", { date: until })}
      </p>

      <label className="flex flex-col gap-2">
        <span className="text-santa-green text-xs font-semibold">
          {t("search")}
        </span>
        <TextInput
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={t("searchPlaceholder")}
          autoComplete="off"
        />
      </label>

      <fieldset className="flex flex-col gap-1">
        <legend className="sr-only">{t("title")}</legend>
        {visible.length === 0 ? (
          <p className="text-santa-muted text-sm">{t("noMatches")}</p>
        ) : (
          visible.map((option) => (
            <label
              key={option.id}
              className="text-santa-ink flex min-h-11 items-center gap-3 text-base"
            >
              <input
                type="radio"
                name="guessedId"
                value={option.id}
                checked={picked === option.id}
                onChange={() => setPicked(option.id)}
                className="accent-santa-green size-5"
              />
              {t("option", {
                name: option.name,
                building: option.building ?? "",
              })}
            </label>
          ))
        )}
      </fieldset>

      {state.error ? <FormAlert>{t(`errors.${state.error}`)}</FormAlert> : null}

      <button
        type="submit"
        disabled={pending || !picked}
        className="bg-santa-green text-santa-white flex h-14 w-full items-center justify-between rounded-full px-6 text-base font-semibold disabled:opacity-60"
      >
        <span>{pending ? t("pending") : t("submit")}</span>
        <ArrowUpRight className="size-[18px]" aria-hidden />
      </button>
      <p className="text-santa-muted text-xs leading-relaxed">{t("hint")}</p>
    </form>
  );
}
