import type { users } from "./schema";

export type NewUser = typeof users.$inferInsert;

let counter = 0;

export function makeUser(overrides: Partial<NewUser> = {}): NewUser {
  counter += 1;
  return {
    email: `user${counter}-${Date.now()}@example.dev`,
    name: `Seed User ${counter}`,
    ...overrides,
  };
}
