"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signInFormAction, type SignInFormState } from "./sign-in-action";

const initialState: SignInFormState = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending ? "Signing in…" : "Sign in"}
    </Button>
  );
}

/**
 * Client credentials form. Uses `useActionState` so a failed sign-in renders
 * the server action's generic error under the form (announced via aria-live)
 * and keeps the submitted email. `redirectTo` is passed through as a hidden
 * field and re-validated server-side in the action.
 *
 * Not optimistic (cf. frontend.md rule 3): a sign-in can't be shown as
 * succeeded before the server confirms the credentials, so the mutation feels
 * responsive via the pending state below rather than an optimistic update.
 */
export function SignInForm({ redirectTo }: { redirectTo?: string }) {
  const [state, formAction] = useActionState(signInFormAction, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-3">
      {redirectTo ? (
        <input type="hidden" name="redirectTo" value={redirectTo} />
      ) : null}
      <div className="flex flex-col gap-2">
        <Label htmlFor="signin-email">Email</Label>
        <Input
          id="signin-email"
          name="email"
          type="email"
          autoComplete="email"
          defaultValue={state.email ?? ""}
          required
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="signin-password">Password</Label>
        <Input
          id="signin-password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
        />
      </div>
      {state.error ? (
        <p role="alert" aria-live="polite" className="text-destructive text-sm">
          {state.error}
        </p>
      ) : null}
      <SubmitButton />
    </form>
  );
}
