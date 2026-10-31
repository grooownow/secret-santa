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
import { PhotoInput } from "@/features/profile";
import { addPost } from "./add-post-action";
import { MAX_POST_LENGTH } from "./schemas";
import type { PostState } from "./state";

const initial: PostState = {};

/** "Добавить запись" (frame V4kc7x): opens right above the feed. */
export function PostForm({ authorName }: { authorName: string }) {
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
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="bg-santa-green text-santa-white flex h-14 w-full items-center justify-between rounded-full px-6 text-base font-semibold"
      >
        <span>{t("open")}</span>
        <Plus className="size-[18px]" aria-hidden />
      </button>
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
      <p className="text-santa-muted text-xs">
        {t("as", { name: authorName })}
      </p>
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
      {state.error ? <FormAlert>{e(state.error)}</FormAlert> : null}
      <SubmitButton pendingLabel={t("posting")} disabled={busy}>
        {t("submit")}
      </SubmitButton>
      <button
        type="button"
        onClick={() => setOpen(false)}
        className="text-santa-green self-start text-[13px] font-semibold underline-offset-4 hover:underline"
      >
        {t("cancel")}
      </button>
    </form>
  );
}
