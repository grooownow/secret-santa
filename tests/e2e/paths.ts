import path from "node:path";

/**
 * Mail sink of the e2e server (see E2E_MAIL_OUTBOX in src/lib/env.ts). Absolute,
 * because the server and the test workers must agree on the file.
 */
export const MAIL_OUTBOX = path.resolve(".e2e", "mail.jsonl");
