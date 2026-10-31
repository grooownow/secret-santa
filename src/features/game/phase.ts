// The phase rules live in `@/lib/game-phase` because Auth.js callbacks
// (src/lib/auth.ts) need `registrationOpen` and `lib` may not import a
// feature. This shim keeps the `@/features/game` import paths unchanged.
export * from "@/lib/game-phase";
