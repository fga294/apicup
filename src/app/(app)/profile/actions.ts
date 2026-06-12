"use server";

import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";

import { auth } from "@/auth";
import { db } from "@/db";
import { users } from "@/db/schema";

export interface PasswordState {
  error?: string;
  ok?: boolean;
}

export async function changePassword(
  _prev: PasswordState,
  formData: FormData,
): Promise<PasswordState> {
  const session = await auth();
  if (!session?.user) return { error: "Not signed in" };

  const current = String(formData.get("currentPassword") ?? "");
  const next = String(formData.get("newPassword") ?? "");
  if (next.length < 8) return { error: "New password must be at least 8 characters" };
  if (next.length > 200) return { error: "New password is too long" };

  const user = await db.query.users.findFirst({
    where: eq(users.id, session.user.userId),
  });
  if (!user || !(await bcrypt.compare(current, user.passwordHash))) {
    return { error: "Current password is incorrect" };
  }

  await db
    .update(users)
    .set({ passwordHash: await bcrypt.hash(next, 10) })
    .where(eq(users.id, user.id));
  return { ok: true };
}
