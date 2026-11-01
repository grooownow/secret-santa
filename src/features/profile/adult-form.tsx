"use client";

import { useTranslations } from "next-intl";
import { useActionState, useState } from "react";
import {
  Field,
  FormAlert,
  SubmitButton,
  TextAreaInput,
  TextInput,
} from "@/components/form-ui";
import { ListboxSelect } from "@/components/listbox-select";
import { BUILDINGS } from "./apartment";
import { PhotoInput } from "./photo-input";
import { saveAdultAction } from "./save-adult-action";
import type { ProfileState } from "./state";

export interface AdultDefaults {
  name: string;
  building: string;
  apartment: string;
  wishes: string;
  avoid: string;
  photoUrl: string | null;
}

const initial: ProfileState = {};

/** Owner's own profile (adult or teen 14+), frames CN5pF (new) and KjReh. */
export function AdultForm({
  defaults,
  mode,
}: {
  defaults: AdultDefaults;
  mode: "create" | "edit";
}) {
  const t = useTranslations("profile.adult");
  const e = useTranslations("profile.errors");
  const [state, formAction] = useActionState(saveAdultAction, initial);
  const [photo, setPhoto] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const v = state.values;

  return (
    <form
      action={(formData) => {
        if (photo) formData.set("photo", photo);
        formAction(formData);
      }}
      className="flex flex-col gap-4"
    >
      <Field label={t("name")}>
        <TextInput
          name="name"
          autoComplete="name"
          maxLength={60}
          required
          placeholder={t("namePlaceholder")}
          defaultValue={v?.name ?? defaults.name}
        />
      </Field>
      <Field label={t("building")}>
        <ListboxSelect
          name="building"
          placeholder={t("buildingPlaceholder")}
          defaultValue={v?.building ?? defaults.building}
          options={BUILDINGS.map((b) => ({ value: b, label: b }))}
        />
      </Field>
      <Field label={t("apartment")} hint={t("apartmentHint")}>
        <TextInput
          name="apartment"
          maxLength={10}
          required
          placeholder={t("apartmentPlaceholder")}
          defaultValue={v?.apartment ?? defaults.apartment}
        />
      </Field>
      <PhotoInput
        currentUrl={defaults.photoUrl}
        onChange={setPhoto}
        onBusyChange={setBusy}
        removeName="removePhoto"
      />
      <Field label={t("wishes")}>
        <TextAreaInput
          name="wishes"
          maxLength={1000}
          placeholder={t("wishesPlaceholder")}
          defaultValue={v?.wishes ?? defaults.wishes}
        />
      </Field>
      <Field label={t("avoid")}>
        <TextAreaInput
          name="avoid"
          maxLength={1000}
          placeholder={t("avoidPlaceholder")}
          defaultValue={v?.avoid ?? defaults.avoid}
        />
      </Field>
      {state.error ? <FormAlert>{e(state.error)}</FormAlert> : null}
      <SubmitButton pendingLabel={t("pending")} disabled={busy}>
        {mode === "create" ? t("create") : t("save")}
      </SubmitButton>
    </form>
  );
}
