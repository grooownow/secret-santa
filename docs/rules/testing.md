# Rule: Testing

**Applies to:** every code change — no feature is done without tests
(spec §5.4).

## Where a test belongs (decision table)

| Kind                               | Vitest project / suite                           | Environment                 | Example                                      |
| ---------------------------------- | ------------------------------------------------ | --------------------------- | -------------------------------------------- |
| Pure logic, server actions, config | `unit` (`vitest.config.ts`, `src/**/*.test.ts`)  | node, db mocked             | `src/lib/env.test.ts`                        |
| Client component behavior          | `component` (`src/**/*.test.tsx`)                | jsdom + Testing Library     | `src/features/profile/profile-form.test.tsx` |
| Action/route against a real db     | `integration` (`tests/integration/**/*.test.ts`) | node, real in-memory PGlite | `tests/integration/profile-action.test.ts`   |
| Full golden-path user flow         | Playwright e2e (`tests/e2e/**/*.spec.ts`)        | real browser, built app     | `tests/e2e/smoke.spec.ts`                    |

Run everything: `pnpm test` (all three Vitest projects) and `pnpm test:e2e`
(Playwright). Both are separate CI jobs in `.github/workflows/ci.yml`
(`quality` runs `pnpm test`; `e2e` runs `pnpm test:e2e`); either red blocks
merge.

**When to add e2e vs. component:** component tests cover one component's
behavior in isolation (interactions, states, a11y attributes); e2e is for a
cross-page flow that only a real browser + real routing can prove (redirects,
navigation type, full-build behavior) — see the four cases already in
`tests/e2e/smoke.spec.ts`. Don't duplicate a component-level assertion in e2e;
don't try to unit-test a redirect chain.

## Prove the test can fail

A new test is not done until you've watched it fail for the right reason:
break the assertion or the subject once, see the red, restore it, see the
green. A test that has never failed is unverified — treat "added a test" and
"proved it can fail" as one step, not two. `(convention — checked at review)`
— enforced by the `feature`/`review` skills' test-honesty check.

## Anti-flaky rules

- **No arbitrary sleeps.** Never `setTimeout`/`page.waitForTimeout()` to wait
  for state. For async UI under test with a mocked action, use the
  deferred-promise pattern — `src/features/profile/profile-form.test.tsx`
  (`deferred()` helper) resolves the mock exactly when the test is ready to
  assert, instead of racing a timer.
- **Fake timers for time-based logic**, not real waits — `src/lib/rate-limit.test.ts`
  uses `vi.useFakeTimers()`/`vi.useRealTimers()` around every case that depends
  on a window elapsing.
- **No shared/order-dependent state.** Each test creates its own data (see
  factories below) and does not depend on another test's side effects or file
  execution order.
- **Playwright suite:** prefer role/text-based or `getByRole`/`getByLabel`
  locators (as in `tests/e2e/smoke.spec.ts`) over CSS/`nth-child` selectors,
  which break on unrelated styling changes.

## False-green bans

- **No assertion-free tests.** A test body that renders/calls something and
  asserts nothing proves nothing — every test needs at least one `expect`.
- **No over-mocked integration tests.** The `integration` project exists
  specifically to run the real code path against a real (if in-memory) db —
  mock only the session/cache boundary (see `tests/integration/profile-action.test.ts`:
  mocks `requireUser` and `revalidatePath`, but not `getDb()`/the database
  itself). Mocking the database inside an `integration` test defeats its
  purpose; that belongs in `unit` instead.
- `(convention — checked at review)` — the `review` skill's test-honesty lens
  checks both bans on every diff.

## Factories and seed data

- Test data factories live in `src/db/factories.ts` (e.g. `makeUser()`) and
  are shared between tests and `scripts/seed.ts` — one source of realistic,
  linked data for both dev and test. Add a factory per new entity as the
  schema grows (spec §5.8); the `feature` skill extends factories/seed when it
  adds a table.
- `tests/integration/helpers/test-db.ts` spins up a fresh PGlite instance per
  test file with migrations applied — this is why the `integration` project
  pins `fileParallelism: false` (PGlite instances don't like concurrent
  access, and there's no cross-file state to share).

## Gates (self-check before done)

- [ ] New behavior has a test at the right level (see table above)
- [ ] Test was proven able to fail
- [ ] No `waitForTimeout`/raw sleep; time-based logic uses fake timers
- [ ] `pnpm test && pnpm test:e2e` both green
