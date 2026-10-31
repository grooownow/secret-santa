"use client";

import { useTranslations } from "next-intl";
import { useActionState, useEffect, useState } from "react";
import {
  Field,
  FormAlert,
  SubmitButton,
  TextInput,
} from "@/components/form-ui";
import { resendVerificationAction, type ResendState } from "./resend-action";

/**
 * "Send again" with a visible 60 second countdown. With `email` known (right
 * after registration) it is a single button; otherwise it asks for the
 * address first (expired verification link, frame wUKDC).
 */
export function ResendForm({
  email,
  startLocked,
  submitLabel,
}: {
  email?: string;
  /** True right after registration, when an email has just been sent. */
  startLocked?: boolean;
  submitLabel?: string;
}) {
  const t = useTranslations("account.checkEmail");
  const [state, formAction] = useActionState(resendVerificationAction, {});
  const [seconds, setSeconds] = useState(startLocked ? 60 : 0);

  // Restart the countdown whenever the server answers with a wait time.
  const [lastState, setLastState] = useState<ResendState>(state);
  if (state !== lastState) {
    setLastState(state);
    if (state.retryAfter !== undefined) setSeconds(state.retryAfter);
  }

  useEffect(() => {
    if (seconds <= 0) return;
    const timer = setTimeout(() => setSeconds((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [seconds]);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {email ? (
        <input type="hidden" name="email" value={email} />
      ) : (
        <Field label={t("email")}>
          <TextInput
            name="email"
            type="email"
            autoComplete="email"
            defaultValue={state.email ?? ""}
            required
          />
        </Field>
      )}
      <SubmitButton disabled={seconds > 0} pendingLabel={t("pending")}>
        {submitLabel ?? t("resend")}
      </SubmitButton>
      {state.status === "invalid" ? (
        <FormAlert>{t("invalid")}</FormAlert>
      ) : null}
      <p className="text-santa-muted text-xs" aria-live="polite">
        {seconds > 0
          ? t("wait", { seconds })
          : state.status === "sent"
            ? t("sentAgain")
            : null}
      </p>
    </form>
  );
}
