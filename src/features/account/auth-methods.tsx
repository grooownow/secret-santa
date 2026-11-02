import { OrDivider } from "@/components/form-ui";
import { GoogleLogo } from "@/components/google-logo";
import { PendingSpinner } from "@/components/spinner";

/**
 * The shared layout of the register and sign-in pages: the Google button on
 * top, then the "or" divider, then the email form. The Google part is left
 * out when Google is not configured. Takes ready labels so it is easy to test.
 */
export function AuthMethods({
  googleAction,
  googleLabel,
  orLabel,
  children,
}: {
  /** Server action bound for the Google form; omit when Google is off. */
  googleAction?: () => Promise<void>;
  googleLabel: string;
  orLabel: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-5">
      {googleAction ? (
        <>
          <form action={googleAction}>
            <button
              type="submit"
              data-testid="google-button"
              className="border-santa-line text-santa-ink bg-santa-white flex h-14 w-full items-center justify-center gap-3 rounded-full border px-6 text-base font-semibold"
            >
              <GoogleLogo className="size-5 shrink-0" />
              <span>{googleLabel}</span>
              <PendingSpinner />
            </button>
          </form>
          <OrDivider label={orLabel} />
        </>
      ) : null}
      {children}
    </div>
  );
}
