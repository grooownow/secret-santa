// `DefaultUser`/`JWT` already declare `id` as an optional property, so this
// augmentation isn't strictly required to compile — it's here to make the
// contract explicit: our `session`/`jwt` callbacks (src/lib/auth.config.ts)
// always populate `id`, so callers can rely on it without an extra check.
import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
  }
}
