import { getDb } from "@/db/client";
import { makeUser } from "@/db/factories";
import { users } from "@/db/schema";
import { hashPassword } from "@/features/auth/password";
import { env } from "@/lib/env";

async function main() {
  if (env.NODE_ENV === "production") {
    throw new Error(
      "Refusing to seed in production: the demo admin is a dev-only account. " +
        "Create your first real user manually instead.",
    );
  }

  const db = getDb();
  const existing = await db.select().from(users);
  if (existing.length > 0) {
    console.log(`Seed skipped: ${existing.length} users already present.`);
    return;
  }

  const passwordHash = await hashPassword(env.SEED_ADMIN_PASSWORD);
  await db.insert(users).values([
    makeUser({
      email: env.SEED_ADMIN_EMAIL,
      name: "Admin",
      passwordHash,
    }),
  ]);

  console.log(`Seeded admin user: ${env.SEED_ADMIN_EMAIL}`);
  console.log(`  password: ${env.SEED_ADMIN_PASSWORD} (dev only — change it)`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exit(1);
  });
