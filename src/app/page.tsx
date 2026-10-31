import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ThemeToggle } from "@/components/theme-toggle";

export default function HomePage() {
  return (
    <main className="bg-background text-foreground flex min-h-screen items-center justify-center p-6">
      <Card className="relative w-full max-w-md">
        <div className="absolute top-4 right-4">
          <ThemeToggle />
        </div>
        <CardHeader>
          <CardTitle className="text-2xl">Gridfin</CardTitle>
          <CardDescription>Agent-native SaaS starter</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">
            Run{" "}
            <code className="bg-muted text-foreground rounded px-1.5 py-0.5 font-mono text-xs">
              /gridfin
            </code>{" "}
            in Claude Code to get started.
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
