// PLANTED DEFECT — see tests/fixtures/planted-defects/ground-truth.json (D5).
// Do not "fix" this file. It is the input to the review skill's detection eval.

// DEFECT (D5): a cross-feature DEEP import. `billing` reaches past `profile`'s
// public API (`@/features/profile`, i.e. its index.ts) and into one of its
// internal files, so profile can no longer change its internals without
// breaking a slice that was never supposed to see them.
import { ProfileForm } from "@/features/profile/profile-form";

import { Button } from "@/components/ui/button";

/**
 * The billing sidebar: plan badge plus the profile form, so a user can correct
 * their name before we put it on an invoice.
 */
export function PlanBadge({ plan, name }: { plan: string; name: string }) {
  return (
    <aside className="flex flex-col gap-4 rounded-lg border p-4">
      <span className="text-muted-foreground text-xs uppercase">{plan}</span>
      <ProfileForm name={name} />
      <Button variant="ghost">Cancel plan</Button>
    </aside>
  );
}
