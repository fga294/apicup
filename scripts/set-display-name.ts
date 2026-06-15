import { eq } from "drizzle-orm";

import { db } from "../src/db";
import { users } from "../src/db/schema";

// One-off admin utility: change a user's display name (a pure label — every
// other table references users by the integer id FK, never by name).
// Usage: tsx --env-file=<env> scripts/set-display-name.ts <email> "<display name>"
async function main() {
  const [emailArg, ...nameParts] = process.argv.slice(2);
  // username == email, stored trimmed + lowercased at registration.
  const username = (emailArg ?? "").trim().toLowerCase();
  const displayName = nameParts.join(" ").trim();
  if (!username || !displayName) {
    console.error('Usage: set-display-name.ts <email> "<display name>"');
    process.exit(1);
  }

  // Abort (don't silently no-op) if the account isn't here — proves we're
  // pointed at the right DB and the email is correct before changing anything.
  const existing = await db.query.users.findFirst({
    where: eq(users.username, username),
  });
  if (!existing) {
    console.error(`No user "${username}" — aborting, nothing changed.`);
    process.exit(1);
  }
  console.log(
    `#${existing.id} ${existing.username}: "${existing.displayName}" -> "${displayName}"`,
  );

  const [updated] = await db
    .update(users)
    .set({ displayName })
    .where(eq(users.username, username))
    .returning({
      id: users.id,
      username: users.username,
      displayName: users.displayName,
    });
  console.log("Updated:", updated);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
