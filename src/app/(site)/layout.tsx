import { redirectIfClosed } from "@/features/game";

// Every page except /closed lives in this group. After the closing date the
// whole site shows only "game over".
export default async function SiteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await redirectIfClosed();
  return children;
}
