"use server";

import bcrypt from "bcryptjs";

import { signIn } from "@/auth";
import { db } from "@/db";
import { users } from "@/db/schema";
import { registerSchema } from "@/lib/validation";

export interface RegisterState {
  error?: string;
}

export async function registerAction(
  _prev: RegisterState,
  formData: FormData,
): Promise<RegisterState> {
  const parsed = registerSchema.safeParse({
    username: formData.get("username"),
    displayName: formData.get("displayName"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const username = parsed.data.username.toLowerCase();
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
    return { error: "That username is already taken" };
  }

  // Sign the new user in and let Auth.js redirect to the dashboard.
  await signIn("credentials", {
    username,
    password: parsed.data.password,
    redirectTo: "/",
  });
  return {};
}
