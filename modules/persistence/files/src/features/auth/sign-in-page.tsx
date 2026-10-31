import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { providerIds } from "@/lib/auth.config";
import { signIn } from "@/lib/auth";
import { safeCallbackUrl } from "./callback-url";
import { SignInForm } from "./sign-in-form";

const PROVIDER_LABELS: Record<string, string> = {
  github: "GitHub",
  google: "Google",
};

async function signInWithProvider(
  providerId: string,
  redirectTo: string | undefined,
) {
  "use server";
  await signIn(providerId, redirectTo ? { redirectTo } : undefined);
}

export interface SignInPageProps {
  /**
   * Raw `?callbackUrl=` query value set by `src/middleware.ts`'s
   * `authorized()` redirect. Attacker-controlled — validated via
   * `safeCallbackUrl` before being forwarded to `signIn()` so a crafted
   * absolute/protocol-relative URL can't be used as an open redirect.
   */
  callbackUrl?: string | string[];
}

/** Server-rendered sign-in screen; consumed by src/app/signin/page.tsx. */
export function SignInPage({ callbackUrl }: SignInPageProps) {
  const redirectTo = safeCallbackUrl(callbackUrl);

  return (
    <div className="flex min-h-svh items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Sign in to Gridfin</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <SignInForm redirectTo={redirectTo} />

          {providerIds.length > 0 ? (
            <>
              <div className="flex items-center gap-3">
                <div className="bg-border h-px flex-1" />
                <span className="text-muted-foreground text-xs">or</span>
                <div className="bg-border h-px flex-1" />
              </div>
              <div className="flex flex-col gap-3">
                {providerIds.map((providerId) => (
                  <form
                    key={providerId}
                    action={signInWithProvider.bind(
                      null,
                      providerId,
                      redirectTo,
                    )}
                  >
                    <Button type="submit" variant="outline" className="w-full">
                      Continue with {PROVIDER_LABELS[providerId] ?? providerId}
                    </Button>
                  </form>
                ))}
              </div>
            </>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
