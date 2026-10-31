import path from "node:path";

/**
 * Mail sink of the e2e server (see E2E_MAIL_OUTBOX in src/lib/env.ts). Absolute,
 * because the server and the test workers must agree on the file.
 */
export const MAIL_OUTBOX = path.resolve(".e2e", "mail.jsonl");

/**
 * The organiser's signed-in browser state, saved by the setup project. The
 * game reuses it instead of signing in again: the sign-in limit is 10 per
 * minute per email, and the auth specs already sign the admin in several
 * times in the same minute.
 */
export const ORGANISER_STATE = path.resolve(".e2e", "organiser.json");
