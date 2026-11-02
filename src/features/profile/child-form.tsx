"use client";

import { useTranslations } from "next-intl";
import { useActionState, useState } from "react";
import {
  CheckboxRow,
  Field,
  FormAlert,
  SubmitButton,
  TextAreaInput,
  TextInput,
} from "@/components/form-ui";
import { saveChildAction } from "./save-child-action";
import type { ProfileState } from "./state";

export interface ChildDefaults {
  id?: string;
  name: string;
  age: string;
  /** "boy" | "girl" | "" (not said). */
  gender: string;
  wishes: string;
  avoid: string;
}

const initial: ProfileState = {};

/** Child profile (frame Bidji). No photo field: photos are for adults only. */
export function ChildForm({
  defaults,
  building,
  apartment,
  mode,
}: {
  defaults: ChildDefaults;
  building: string;
  apartment: string;
  mode: "create" | "edit";
}) {
  const t = useTranslations("profile.child");
  const e = useTranslations("profile.errors");
  const [state, formAction] = useActionState(saveChildAction, initial);
  const v = state.values;
  const [age, setAge] = useState(v?.age ?? defaults.age);
  const teen = Number(age) >= 14;
  const gender = v?.gender ?? defaults.gender;

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {defaults.id ? (
        <input type="hidden" name="id" value={defaults.id} />
      ) : null}
      <Field label={t("name")}>
        <TextInput
          name="name"
          maxLength={60}
          required
          placeholder={t("namePlaceholder")}
          defaultValue={v?.name ?? defaults.name}
        />
      </Field>
      <Field label={t("age")}>
        <TextInput
          name="age"
          type="number"
          inputMode="numeric"
          min={0}
          max={17}
          step={1}
          required
          placeholder={t("agePlaceholder")}
          value={age}
          onChange={(event) => setAge(event.target.value)}
        />
      </Field>
      {/* Optional: three pills, "not said" by default. Radios, so the
          keyboard and screen readers treat it as one choice. */}
      <fieldset className="flex flex-col gap-2">
        <legend className="text-santa-green mb-2 text-xs font-semibold">
          {t("gender")}
        </legend>
        <div className="flex flex-wrap gap-2">
          {(["boy", "girl", ""] as const).map((value) => (
            <label
              key={value || "none"}
              className="border-santa-line text-santa-ink has-checked:border-santa-green has-checked:bg-santa-mint has-checked:text-santa-green has-focus-visible:outline-santa-green flex h-10 cursor-pointer items-center rounded-full border px-4 text-sm font-semibold has-focus-visible:outline-2 has-focus-visible:outline-offset-2"
            >
              <input
                type="radio"
                name="gender"
                value={value}
                defaultChecked={gender === value}
                className="sr-only"
              />
              {t(value ? `gender_${value}` : "gender_none")}
            </label>
          ))}
        </div>
      </fieldset>
      <div className="bg-santa-mint flex flex-col gap-1 rounded-2xl p-4">
        <p className="text-santa-green text-sm font-bold">
          {t("address", { building, apartment })}
        </p>
        <p className="text-santa-muted text-xs leading-relaxed">
          {t("addressHint")}
        </p>
      </div>
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
      <CheckboxRow name="guardian" invalid={state.error === "consent"}>
        {teen ? t("consentTeen") : t("consentUnder14")}
      </CheckboxRow>
      {state.error ? <FormAlert>{e(state.error)}</FormAlert> : null}
      <SubmitButton pendingLabel={t("pending")}>
        {mode === "create" ? t("create") : t("save")}
      </SubmitButton>
    </form>
  );
}
