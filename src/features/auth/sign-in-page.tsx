import { getTranslations } from "next-intl/server";
import {
  AuthMethodsWithGoogle,
  AuthShell,
  PageText,
  PageTitle,
} from "@/features/account";
import { safeCallbackUrl } from "./callback-url";
import { SignInForm } from "./sign-in-form";

export interface SignInPageProps {
  /**
   * Raw `?callbackUrl=` query value set by `src/middleware.ts`'s
   * `authorized()` redirect. Attacker-controlled — validated via
   * `safeCallbackUrl` before being forwarded, so a crafted absolute or
   * protocol-relative URL cannot be used as an open redirect.
   */
  callbackUrl?: string | string[];
  /** Raw `?error=` set by Auth.js when a Google sign-in was refused. */
  error?: string | string[];
}

/** Server-rendered sign-in screen: Google first, "or", then email and password. */
export async function SignInPage({ callbackUrl, error }: SignInPageProps) {
  const t = await getTranslations("account.signIn");
  const redirectTo = safeCallbackUrl(callbackUrl);
  const code = typeof error === "string" ? error : undefined;
  const notice =
    code === "AccessDenied" ? "denied" : code ? "failed" : undefined;

  return (
    <AuthShell>
      <PageTitle>{t("title")}</PageTitle>
      <PageText>{t("text")}</PageText>
      <AuthMethodsWithGoogle redirectTo={redirectTo}>
        <SignInForm redirectTo={redirectTo} notice={notice} />
      </AuthMethodsWithGoogle>
    </AuthShell>
  );
}
