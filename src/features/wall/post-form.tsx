"use client";

import { Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { useActionState, useState } from "react";
import {
  Field,
  FormAlert,
  SubmitButton,
  TextAreaInput,
} from "@/components/form-ui";
// Deep import on purpose: the profile index pulls server-only code (db,
// next/headers) into this client component and breaks `next build`.
// eslint-disable-next-line boundaries/dependencies
import { PhotoInput } from "@/features/profile/photo-input";
import { addPost } from "./add-post-action";
import { MAX_POST_LENGTH } from "./schemas";
import type { PostState } from "./state";

const initial: PostState = {};

/** "Добавить запись" (frame V4kc7x): opens right above the feed. */
export function PostForm({
  authorName,
  children,
}: {
  authorName: string;
  /** The feed: hidden while the form is open (frame V4kc7x is its own screen). */
  children: React.ReactNode;
}) {
  const t = useTranslations("wall.add");
  const e = useTranslations("wall.errors");
  const [open, setOpen] = useState(false);
  const [photo, setPhoto] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [state, formAction] = useActionState(
    async (prev: PostState, formData: FormData) => {
      const result = await addPost(prev, formData);
      if (result.posted) {
        setOpen(false);
        setPhoto(null);
      }
      return result;
    },
    initial,
  );

  if (!open) {
    return (
      // Phone: the button above the feed. Desktop: the feed with the button in
      // a mint side card, as in the mockup.
      <div
        data-wide
        className="flex flex-col gap-5 lg:grid lg:grid-cols-[minmax(0,704px)_minmax(0,352px)] lg:items-start lg:justify-between lg:gap-16"
      >
        <div className="lg:bg-santa-mint lg:col-start-2 lg:row-start-1 lg:rounded-2xl lg:p-7">
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="bg-santa-green text-santa-white flex h-14 w-full items-center justify-between rounded-full px-6 text-base font-semibold"
          >
            <span>{t("open")}</span>
            <Plus className="size-[18px]" aria-hidden />
          </button>
        </div>
        <div className="flex flex-col gap-5 lg:col-start-1 lg:row-start-1">
          {children}
        </div>
      </div>
    );
  }

  return (
    <form
      action={(formData) => {
        if (photo) formData.set("photo", photo);
        formAction(formData);
      }}
      className="flex flex-col gap-4"
    >
      <button
        type="button"
        onClick={() => setOpen(false)}
        className="text-santa-green self-start text-[13px] font-semibold"
      >
        {t("back")}
      </button>
      <Field label={t("text")}>
        <TextAreaInput
          name="text"
          required
          maxLength={MAX_POST_LENGTH}
          placeholder={t("placeholder")}
          defaultValue={state.text ?? ""}
        />
      </Field>
      <PhotoInput
        namespace="wall.photo"
        onChange={setPhoto}
        onBusyChange={setBusy}
      />
      <div className="bg-santa-mint flex flex-col gap-[7px] rounded-xl p-[18px]">
        <p className="text-santa-ink text-[17px] font-bold">
          {t("visibleTitle")}
        </p>
        <p className="text-santa-muted text-[13px] leading-relaxed">
          {t("as", { name: authorName })}
        </p>
      </div>
      {state.error ? <FormAlert>{e(state.error)}</FormAlert> : null}
      <SubmitButton pendingLabel={t("posting")} disabled={busy}>
        {t("submit")}
      </SubmitButton>
      <button
        type="button"
        onClick={() => setOpen(false)}
        className="text-santa-green self-start text-[13px] font-semibold"
      >
        {t("cancel")}
      </button>
    </form>
  );
}
