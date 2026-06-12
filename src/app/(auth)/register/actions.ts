"use server";

import bcrypt from "bcryptjs";

import { signIn } from "@/auth";
import { db } from "@/db";
import { users } from "@/db/schema";
import { rateLimitOk } from "@/lib/rateLimit";
import { registerSchema } from "@/lib/validation";

export interface RegisterState {
  error?: string;
}

export async function registerAction(
  _prev: RegisterState,
  formData: FormData,
): Promise<RegisterState> {
  if (!(await rateLimitOk("register", 5, 60_000))) {
    return { error: "Too many attempts — try again in a minute" };
  }
  const parsed = registerSchema.safeParse({
    email: formData.get("email"),
    displayName: formData.get("displayName"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  // The email is the login identifier, stored in the username column.
  const username = parsed.data.email;
  const passwordHash = await bcrypt.hash(parsed.data.password, 10);

  const inserted = await db
    .insert(users)
    .values({
      username,
      displayName: parsed.data.displayName,
      passwordHash,
    })
    .onConflictDoNothing({ target: users.username })
    .returning({ id: users.id });

  if (inserted.length === 0) {
    return { error: "That email is already registered" };
  }

  // Sign the new user in; the dashboard shows the welcome modal once.
  await signIn("credentials", {
    username,
    password: parsed.data.password,
    redirectTo: "/?welcome=1",
  });
  return {};
}
