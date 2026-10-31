/**
 * Validates a `?callbackUrl=` query value before forwarding it to
 * `signIn(providerId, { redirectTo })`. `src/middleware.ts`'s `authorized()`
 * callback sets this param when it redirects an unauthenticated request to
 * `/signin`, but the param is attacker-controlled (any visitor can craft a
 * sign-in link with an arbitrary `callbackUrl`). Only same-origin relative
 * paths are accepted — anything else (an absolute URL to another host, a
 * protocol-relative `//host` URL, or the `/\host` browser-normalization
 * trick some browsers treat as `//host`) is an open-redirect vector and is
 * rejected in favor of falling back to the default post-sign-in redirect.
 */
export function safeCallbackUrl(
  value: string | string[] | undefined,
): string | undefined {
  if (typeof value !== "string" || value.length === 0) {
    return undefined;
  }
  if (
    !value.startsWith("/") ||
    value.startsWith("//") ||
    value.startsWith("/\\")
  ) {
    return undefined;
  }
  return value;
}
