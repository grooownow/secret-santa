// PLANTED DEFECT — see tests/fixtures/planted-defects/ground-truth.json (D2).
// Do not "fix" this file. It is the input to the review skill's detection eval.
import { Button } from "@/components/ui/button";

/**
 * The upsell banner shown on the dashboard when a user is on the free plan.
 */
export function UpgradeCta({ plan }: { plan: string }) {
  if (plan !== "free") return null;

  return (
    <section className="bg-muted flex flex-col gap-2 rounded-lg p-4">
      <h2 className="text-lg font-semibold">You are on the free plan</h2>
      <p className="text-muted-foreground text-sm">
        Upgrade to unlock the full dashboard.
      </p>
      {/* DEFECT (D2): a raw anchor to an internal route. This is a full document
          load — it drops client-side routing and the app's React state. */}
      <a href="/dashboard/billing" className="underline">
        See the plans
      </a>
      <Button variant="secondary">Maybe later</Button>
    </section>
  );
}
