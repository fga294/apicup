import crypto from "node:crypto";

import bcrypt from "bcryptjs";

import { db } from "../src/db";
import { users } from "../src/db/schema";

export const AI_USERNAME = "mq-chat";

async function main() {
  const adminPassword =
    process.env.SEED_ADMIN_PASSWORD ?? crypto.randomBytes(9).toString("base64url");

  const adminInserted = await db
    .insert(users)
    .values({
      username: "admin",
      displayName: "Admin",
      passwordHash: await bcrypt.hash(adminPassword, 10),
      role: "admin",
    })
    .onConflictDoNothing({ target: users.username })
    .returning({ id: users.id });

  // The AI contestant never logs in: its password hash is unmatchable by
  // bcrypt.compare, and authorize() rejects is_ai accounts outright.
  const aiInserted = await db
    .insert(users)
    .values({
      username: AI_USERNAME,
      displayName: "MQ-Chat: ModelOpus 4.8",
      passwordHash: "!ai-account-no-login!",
      isAi: true,
    })
    .onConflictDoNothing({ target: users.username })
    .returning({ id: users.id });

  if (adminInserted.length > 0) {
    console.log(`Created admin account — username: admin, password: ${adminPassword}`);
    if (!process.env.SEED_ADMIN_PASSWORD) {
      console.log("(Save this password — it is only shown once.)");
    }
  } else {
    console.log("Admin account already exists, skipped.");
  }
  console.log(
    aiInserted.length > 0
      ? "Created AI contestant: MQ-Chat: ModelOpus 4.8"
      : "AI contestant already exists, skipped.",
  );
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
