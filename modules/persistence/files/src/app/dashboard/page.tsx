import type { Metadata } from "next";
import { Button } from "@/components/ui/button";
import { requireUser } from "@/features/auth";
import { ProfileForm, updateName } from "@/features/profile";
import { signOut } from "@/lib/auth";

export const metadata: Metadata = { title: "Dashboard" };

async function signOutAction() {
  "use server";
  await signOut();
}

export default async function DashboardPage() {
  const user = await requireUser();
  const greetingName = user.name ?? user.email ?? "there";

  return (
    <div className="mx-auto flex min-h-svh max-w-2xl flex-col justify-center gap-6 p-6">
      <div className="flex flex-col gap-1">
        <h1 className="font-heading text-2xl font-medium">
          Welcome, {greetingName}
        </h1>
        {user.email ? (
          <p className="text-muted-foreground text-sm">{user.email}</p>
        ) : null}
      </div>
      <ProfileForm currentName={user.name ?? null} action={updateName} />
      <form action={signOutAction}>
        <Button type="submit" variant="outline">
          Sign out
        </Button>
      </form>
    </div>
  );
}
