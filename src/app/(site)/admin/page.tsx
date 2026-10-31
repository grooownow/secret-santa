import { getOverview, OverviewView } from "@/features/admin";
import { getSettings } from "@/features/game";

// The draw mailing runs after the response (see runDraw), so allow it time.
export const maxDuration = 300;

export default async function AdminOverviewPage() {
  const [overview, settings] = await Promise.all([
    getOverview(),
    getSettings(),
  ]);
  return <OverviewView overview={overview} settings={settings} />;
}
