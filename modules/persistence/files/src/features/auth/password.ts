// Re-exported from `@/lib/password`: password hashing is cross-cutting
// infrastructure (bcrypt only, no feature-specific logic), and
// `src/lib/auth.ts` needs it too. `lib` may not import a `feature`
// (docs/rules/architecture.md), so the real implementation lives in
// `src/lib/password.ts`; this shim keeps the existing `@/features/auth/*`
// import paths (scripts/seed.ts, this slice's `index.ts`) working unchanged.
export { hashPassword, verifyPassword } from "@/lib/password";
