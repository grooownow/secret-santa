import { compare, hash } from "bcryptjs";

// Cost factor 10 — the bcryptjs default; ample for a template, fast enough
// that the sign-in path stays responsive under the local dev server.
const SALT_ROUNDS = 10;

export function hashPassword(plain: string): Promise<string> {
  return hash(plain, SALT_ROUNDS);
}

export function verifyPassword(
  plain: string,
  passwordHash: string,
): Promise<boolean> {
  return compare(plain, passwordHash);
}
