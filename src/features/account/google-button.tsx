import { getTranslations } from "next-intl/server";
import { providerIds } from "@/lib/auth.config";
import { AuthMethods } from "./auth-methods";
import { googleSignInAction } from "./google-sign-in";

/**
 * Google button (only when Google is configured), the "or" divider and the
 * given email form, in that order. Used by the register and sign-in pages.
 */
export async function AuthMethodsWithGoogle({
  redirectTo,
  children,
}: {
  redirectTo?: string;
  children: React.ReactNode;
}) {
  const t = await getTranslations("account.common");
  const googleOn = providerIds.includes("google");
  return (
    <AuthMethods
      googleAction={
        googleOn ? googleSignInAction.bind(null, redirectTo) : undefined
      }
      googleLabel={t("google")}
      orLabel={t("or")}
    >
      {children}
    </AuthMethods>
  );
}
