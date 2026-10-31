import type { participants, users } from "./schema";

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

export type NewParticipant = typeof participants.$inferInsert;

export function makeParticipant(
  userId: string,
  overrides: Partial<Omit<NewParticipant, "userId">> = {},
): NewParticipant {
  counter += 1;
  return {
    userId,
    kind: "adult",
    name: `Participant ${counter}`,
    ...overrides,
  };
}
