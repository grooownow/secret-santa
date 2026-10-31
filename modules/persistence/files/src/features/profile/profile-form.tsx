"use client";

import { useActionState, useOptimistic } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { updateName } from "./update-name-action";

type ActionResult = Awaited<ReturnType<typeof updateName>>;

const idleState: ActionResult = { ok: true };

interface ProfileFormProps {
  currentName: string | null;
  /** The server action to call, passed as a prop so this component stays
   * plain-render testable/story-able without a real "use server" module. */
  action: typeof updateName;
}

/** Client half of the exemplar: `useActionState` drives the server round
 * trip and `useOptimistic` shows the new name immediately on submit,
 * rolling back to the server-confirmed value if validation fails. */
export function ProfileForm({ currentName, action }: ProfileFormProps) {
  const [optimisticName, setOptimisticName] = useOptimistic(currentName);

  const [state, formAction, isPending] = useActionState<ActionResult, FormData>(
    async (_prevState, formData) => {
      const name = String(formData.get("name") ?? "");
      setOptimisticName(name);
      return action({ name });
    },
    idleState,
  );

  return (
    <div className="flex flex-col gap-3">
      <p className="text-muted-foreground text-sm">
        Signed in as{" "}
        <span className="text-foreground font-medium">
          {optimisticName ?? "—"}
        </span>
      </p>
      <form action={formAction} className="flex flex-col gap-2">
        <Label htmlFor="profile-name">Name</Label>
        <div className="flex gap-2">
          <Input
            id="profile-name"
            name="name"
            defaultValue={currentName ?? ""}
            maxLength={80}
            aria-invalid={!state.ok}
            aria-describedby={state.ok ? undefined : "profile-name-error"}
          />
          <Button type="submit" disabled={isPending} aria-busy={isPending}>
            Save
          </Button>
        </div>
        {!state.ok ? (
          <p
            id="profile-name-error"
            role="alert"
            className="text-destructive text-sm"
          >
            {state.error}
          </p>
        ) : null}
      </form>
    </div>
  );
}
